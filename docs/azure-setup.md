# Azure App Registration Setup Guide

## Step 1 — Create the App Registration

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search **"App registrations"** → click **New registration**
3. Fill in:
   - **Name**: `TaskMaster`
   - **Supported account types**: _Accounts in any organizational directory and personal Microsoft accounts_
     (or "Single tenant" if you only use your own work account)
   - **Redirect URI**: Platform = **Web**, URI = `http://localhost:3001/api/auth/microsoft/callback`
4. Click **Register**

Copy the following values into your `.env`:
```
AZURE_CLIENT_ID=    (Application (client) ID)
AZURE_TENANT_ID=    (Directory (tenant) ID) — use "common" for multi-tenant
```

---

## Step 2 — Create a Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Set expiry: 24 months (or custom)
4. Copy the **Value** (shown once!) into `.env`:
```
AZURE_CLIENT_SECRET=<paste secret value here>
```

---

## Step 3 — API Permissions

Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**

Add these permissions:
| Permission | Why |
|-----------|-----|
| `openid` | Required for OIDC sign-in |
| `profile` | User name + avatar |
| `email` | User email address |
| `offline_access` | Refresh tokens (keep user signed in) |
| `User.Read` | Read user profile |
| `Mail.Read` | Read messages to detect flagged mail |
| `Mail.ReadWrite` | Move messages to "Tasks" folder |
| `Mail.Send` | Send daily digest email |
| `Calendars.Read` | Read calendar events |
| `Calendars.ReadWrite` | Create focus block events |

After adding, click **Grant admin consent** (requires admin account or user consent flow).

---

## Step 4 — Configure Redirect URIs

Go to **Authentication** in your app registration.

**Web platform redirects** (add all you need):
```
http://localhost:3001/api/auth/microsoft/callback   ← local dev
https://yourdomain.com/api/auth/microsoft/callback  ← production
```

Enable:
- [x] **Access tokens** (Implicit grant)
- [x] **ID tokens** (Implicit grant)

Under **Front-channel logout URL** (optional):
```
http://localhost:3000/login
```

---

## Step 5 — Token Configuration

Go to **Token configuration** → **Add optional claim** → **ID token**:
- Add `email`, `upn`, `preferred_username`

---

## Step 6 — Local Webhook Setup with ngrok

Microsoft Graph webhooks require a **publicly accessible HTTPS endpoint**.
For local development, use [ngrok](https://ngrok.com):

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3001
```

Copy the `https://xxxx.ngrok.io` URL and set:
```env
WEBHOOK_BASE_URL=https://xxxx.ngrok.io
```

Then create subscriptions from the Settings page in the app, or call:
```bash
curl -X POST http://localhost:3001/api/outlook/subscriptions/mail \
  -H "Authorization: Bearer <your-access-token>"
```

> **Note:** ngrok URL changes on restart. For persistent local testing, use ngrok's paid plan
> or a tunnel service like [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

---

## Step 7 — Verify the Flow

1. Start the app: `docker compose up` (or dev servers)
2. Navigate to `http://localhost:3000`
3. Click **Continue with Microsoft**
4. Complete OAuth consent flow
5. Verify you're redirected back to `/today`
6. Check backend logs: `docker logs taskmaster-backend`

---

## Graph Subscription Limits

| Resource | Max expiry |
|---------|-----------|
| Mail | 4230 minutes (~3 days) |
| Calendar | 4230 minutes |

The app automatically renews subscriptions every 6h via the scheduler.
If the backend is down for >3 days, subscriptions must be re-created from Settings.

---

## Required Graph API Endpoints Used

| Endpoint | Purpose |
|---------|---------|
| `GET /me` | User profile |
| `GET /me/messages/{id}` | Fetch flagged email |
| `GET /me/events/{id}` | Fetch calendar event |
| `POST /me/sendMail` | Daily digest |
| `POST /me/events` | Create focus block |
| `POST /subscriptions` | Create webhook |
| `PATCH /subscriptions/{id}` | Renew webhook |
| `DELETE /subscriptions/{id}` | Delete webhook |

---

## Security Notes

- Never expose `AZURE_CLIENT_SECRET` in frontend code or logs
- The backend encrypts all OAuth tokens at rest (AES-256-GCM)
- Webhook notifications are validated via `clientState` matching
- In production, always use HTTPS for all redirect URIs
- Enable Conditional Access in Entra ID for additional security
