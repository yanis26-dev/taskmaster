FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production ───────────────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
COPY package*.json ./

EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
