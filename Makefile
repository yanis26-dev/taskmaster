.PHONY: up down logs infra dev dev-backend dev-frontend install migrate seed studio test test-e2e lint gen-keys tunnel

# ── Docker (production-like) ──────────────────────────────────────────────────
up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

# ── Infrastructure only (for local dev) ──────────────────────────────────────
infra:
	docker compose up -d postgres redis

# ── Local development ─────────────────────────────────────────────────────────
install:
	cd backend && npm install
	cd frontend && npm install

migrate:
	cd backend && npx prisma migrate dev

seed:
	cd backend && npm run prisma:seed

studio:
	cd backend && npx prisma studio

dev-backend:
	cd backend && npm run start:dev

dev-frontend:
	cd frontend && npm run dev

tunnel:
	ngrok http 3001

# ── Tests ─────────────────────────────────────────────────────────────────────
test:
	cd backend && npm test

test-e2e:
	cd backend && npm run test:e2e

# ── Linting ───────────────────────────────────────────────────────────────────
lint:
	cd backend && npm run lint
	cd frontend && npm run lint

# ── Crypto key generation ─────────────────────────────────────────────────────
gen-keys:
	@echo "TOKEN_ENCRYPTION_KEY=$$(openssl rand -hex 32)"
	@echo "JWT_SECRET=$$(openssl rand -hex 48)"
	@echo "WEBHOOK_CLIENT_STATE_SECRET=$$(openssl rand -hex 24)"
