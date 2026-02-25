# TaskMaster — Personal Task Management System

## Technical Design Document

### Stack Choices

| Layer | Choice | Why |
|-------|--------|-----|
| Backend framework | **NestJS** (TypeScript) | Structured modules, DI container, decorators, and Guards make auth/webhook middleware clean. Ships with excellent support for Prisma, BullMQ, Passport. |
| Frontend | **Next.js 14** (App Router, TypeScript) | File-based routing, server components for fast initial load, API routes for BFF proxy. |
| Styling | **Tailwind CSS** + **Radix UI** | Utility-first with accessible headless primitives — zero design system to build from scratch. |
| ORM | **Prisma** | Type-safe, migrations, excellent TS DX. |
| Database | **PostgreSQL 16** | Reliable, JSONB for payloads, array types for tags. |
| Queue / Jobs | **BullMQ** + **Redis 7** | Battle-tested, delay/retry/cron scheduling, UI (Bull Board) for debugging. |
| Auth | **Microsoft Entra ID** (OAuth 2.0 PKCE) + **JWT** | Single sign-on with M365 tenant; Passport-Azure-AD strategy. |
| Graph API | **@microsoft/microsoft-graph-client** | Official typed client for mail + calendar subscriptions. |
| Token security | AES-256-GCM encrypted at rest (via Node `crypto`) stored in Postgres | Never store plaintext refresh tokens. |

---

### Data Model Summary

```
User ──< Task >── Project
         |
         ├── ActivityLog
         └── RecurrenceRule (iCal RRULE string)

User ──< UserSettings
User ──< OutlookSubscription
```

See `backend/prisma/schema.prisma` for full schema.

---

### Key Flows

#### A. Email → Task
```
Outlook (flagged / moved to "Tasks" folder)
  → Graph change notification → POST /webhooks/outlook/mail
  → BullMQ "outlook-mail" queue
  → WebhookProcessor: fetch message via Graph API
  → Idempotency check: external_ref.id == message.id
  → Create Task (source: outlook_email, external_ref)
```

#### B. Calendar → Task
```
Outlook calendar event (title starts "TODO:" OR category "Task")
  → Graph change notification → POST /webhooks/outlook/calendar
  → BullMQ "outlook-calendar" queue
  → CalendarProcessor: fetch event via Graph
  → Upsert Task by external_ref.id
  → If task has due_at + estimate_minutes → optionally create focus block event
```

#### C. Daily Digest
```
BullMQ cron job at user.settings.digestTime (default 07:30 local)
  → Fetch tasks: today + overdue + top-3 by priority
  → Render Markdown/HTML template
  → Send via Graph API /me/sendMail
```

#### D. Recurring Tasks
```
BullMQ cron job every hour
  → Find tasks with recurrence_rule and status=done where next occurrence not yet spawned
  → Parse RRULE with rrule.js → compute next due_at
  → Create child task, update parent.last_recurrence_at
```

---

### Security Considerations

1. **Token Storage** — MS refresh tokens encrypted with AES-256-GCM. Key derived from `TOKEN_ENCRYPTION_KEY` env var (32-byte hex). Never logs tokens.
2. **Webhook Validation** — Graph sends `validationToken` query param on subscription creation; endpoint must echo it back within 10 s. Subsequent notifications verified with HMAC-SHA256 client state secret.
3. **JWT** — Short-lived access tokens (15 min) + HTTP-only cookie refresh rotation. CSRF protection via `SameSite=Strict`.
4. **Rate limiting** — NestJS Throttler guard on all public endpoints.
5. **CORS** — Restricted to `FRONTEND_URL` origin.
6. **Input validation** — `class-validator` DTOs on every endpoint.
7. **Secrets** — All secrets via `.env` (never committed). Docker Compose uses env_file.

---

### Azure App Registration Setup

See `docs/azure-setup.md` for exact portal steps.

Required Graph permissions (Application + Delegated):
- `Mail.Read`, `Mail.ReadWrite` (read flagged mail, move to folder)
- `Mail.Send` (daily digest)
- `Calendars.Read`, `Calendars.ReadWrite` (create focus blocks)
- `User.Read` (profile)
- `offline_access` (refresh tokens)

Webhook notification URLs must be HTTPS. Use ngrok for local dev.

---

## Local Development

```bash
# 1. Clone and copy env
cp .env.example .env
# Fill in AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, TOKEN_ENCRYPTION_KEY

# 2. Start infrastructure
docker compose up -d postgres redis

# 3. Run migrations + seed
cd backend && npm install && npx prisma migrate dev && npx prisma db seed

# 4. Start backend
npm run start:dev

# 5. Start frontend (new terminal)
cd ../frontend && npm install && npm run dev

# 6. (Optional) Expose webhooks with ngrok
ngrok http 3001
# Set WEBHOOK_BASE_URL=https://xxxx.ngrok.io in .env
# Then call POST /api/outlook/subscriptions/create in the app
```

Full Docker Compose (all services):
```bash
docker compose up --build
```

App available at http://localhost:3000
API at http://localhost:3001/api
Bull Board at http://localhost:3001/admin/queues

---

## Railway Deployment

Both backend and frontend are deployed as separate Railway services.

**Backend service** — NestJS API. Railway sets `PORT` automatically.

**Frontend service** — Next.js standalone build in Docker. Key build args:
- `BACKEND_INTERNAL_URL` must be passed as a Docker `ARG` so the Next.js `rewrites()` proxy destination is baked in at build time (standalone mode evaluates env vars during build, not at runtime).

**Required env vars (backend):**
- `DATABASE_URL`, `REDIS_URL`
- `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`
- `AZURE_REDIRECT_URI` — must point to the **frontend proxy** URL (e.g., `https://<frontend>.up.railway.app/api/auth/microsoft/callback`) so cookies set during OAuth stay on the same origin
- `FRONTEND_URL` — the frontend public URL (used for invite links and CORS)
- `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `WEBHOOK_CLIENT_STATE_SECRET`

**Required env vars (frontend):**
- `BACKEND_INTERNAL_URL` — the backend's Railway internal or public URL (used in `next.config.mjs` rewrites)

---

## Admin Portal

Accessible at `/admin` for users with `role: admin`. Features:

- **Add User** — Pre-register accounts with name, email, and role (user/admin). The user signs in later with their Microsoft account, which auto-links via email matching.
- **Invite by Email** — Send an invitation email via Microsoft Graph. The recipient clicks the link and signs in.
- **Generate Invite Link** — Create a shareable link without sending an email. Useful when email delivery is unreliable.
- **Manage Users** — Toggle roles, view task counts, delete users.
- **Manage Invitations** — View pending invitations, copy links, revoke.

The invite landing page at `/invite?token=...` prompts the user to sign in with Microsoft.

---

## Webhook Deduplication

Outlook Graph notifications can fire multiple events (`created` + `updated`) for a single email flag.
The webhook processor handles this atomically:
- Only `created` events produce new tasks; `updated` events for non-existing tasks are ignored.
- Task creation uses a single `prisma.task.create()` with `externalId` set, protected by the `@@unique([userId, externalProvider, externalId])` DB constraint.
- If a concurrent job races past the check, the P2002 unique-violation error is caught and the duplicate is silently skipped.

---

## Project Structure

```
taskmaster/
├── README.md
├── docker-compose.yml
├── .env.example
├── backend/                    # NestJS API
│   ├── Dockerfile
│   ├── prisma/schema.prisma
│   └── src/
│       ├── admin/              # Admin portal (users, invitations)
│       ├── auth/               # MS OAuth + JWT
│       ├── tasks/              # CRUD + recurrence
│       ├── projects/           # Project CRUD
│       ├── outlook/            # Graph API + webhooks
│       ├── jobs/               # BullMQ processors
│       ├── settings/           # User preferences
│       └── common/             # Guards, decorators, crypto
├── frontend/                   # Next.js app
│   └── src/
│       ├── app/                # App Router pages
│       │   ├── invite/         # Invite landing page
│       │   └── (dashboard)/admin/  # Admin portal
│       ├── components/         # UI components
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # API client, utils
│       └── store/              # Zustand state
└── infra/
    └── docker/                 # Dockerfiles
```
