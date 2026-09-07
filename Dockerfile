# TripMate v2 — production image. Multi-stage build that ships the Next.js
# standalone server (node:24-alpine runtime, non-root).
#
# No .env and no build args are required:
#   docker build -t tripmate .
# The ONE build arg is R2_PUBLIC_URL — next.config.ts whitelists that host
# for next/image optimization at BUILD time, so pass it when storage=r2:
#   docker build --build-arg R2_PUBLIC_URL=https://cdn.example.com -t tripmate .
#
# WHY THE BUILDER RUNS ITS OWN POSTGRES: with Cache Components, `next build`
# prerenders PPR shells by executing the 'use cache' data scopes (the
# settings-driven root layout among them) — a reachable, migrated+seeded
# database is REQUIRED at build time (verified: a build against an
# unreachable DB fails at export). Rather than depend on an external DB
# (which Portainer/host builds don't have), the builder starts a throwaway
# local cluster, migrates + seeds it, builds, and discards it. Nothing from
# that database reaches the image — only the prerendered cache does.
#
# SCHEMA AUTO-MIGRATION ON EVERY DEPLOY: the runner applies every pending
# drizzle/ migration at container START (scripts/auto-migrate.mjs) before the
# server boots — the same guarantee Vercel gets at build time. Re-deploys and
# fresh deploys on Docker/Portainer therefore push schema changes
# automatically. Migrations run over DATABASE_URL_MIGRATE when set (Supabase
# session pooler / direct), falling back to DATABASE_URL. Set
# SKIP_DB_MIGRATE=1 to opt out.

# --- deps: full dependency install (dev deps included — the builder needs
# the Next/Turbopack + drizzle-kit/tsx toolchain; they never reach the runner).
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- deps-prod: production-only node_modules for the runner. Turbopack bundles
# the server's runtime imports into its output, so the standalone folder does
# NOT carry postgres / drizzle-orm on disk; the runner merges this full
# production set next to the traced output so scripts/auto-migrate.mjs (and any
# future boot script) can resolve its dependencies.
FROM node:24-alpine AS deps-prod
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- builder: compile the standalone output.
FROM node:24-alpine AS builder
WORKDIR /app
# postgresql server+client for the throwaway build cluster. The apk package
# name differs across Alpine releases (postgresql16 on 3.20-3.21,
# postgresql17 on 3.22+), so try both and resolve the real bindir below.
RUN (apk add --no-cache postgresql16 || apk add --no-cache postgresql17) && chown node:node /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
# Build-time dummies for the non-DB env: zod validation can run during config
# load. AUTH_SECRET here is NOT a secret — it only satisfies the 32-char
# minimum during prerender; the real one is injected at RUNTIME via compose
# (see docker-compose.yml) and never touches a build layer.
ENV NEXT_TELEMETRY_DISABLED=1 \
    AUTH_SECRET=build-time-dummy-secret-0000000000000000 \
    APP_URL=http://localhost:3000
# The only env that changes BUILD OUTPUT (images.remotePatterns in
# next.config.ts). Passed at build time only when STORAGE_DRIVER=r2.
ARG R2_PUBLIC_URL=
# initdb's default pg_hba trusts local TCP, so no password is needed for the
# throwaway cluster. Socket dir is pinned into /tmp/pg (alpine's build default
# /run/postgresql does not exist inside a build stage). fsync=off is safe —
# the cluster is discarded the moment the build finishes. -m immediate stop:
# nothing else will ever connect.
RUN set -eu; \
    PGBIN=$(ls -d /usr/libexec/postgresql* | head -n1); \
    "$PGBIN/initdb" -D /tmp/pg -U postgres -E UTF8 --no-locale; \
    "$PGBIN/pg_ctl" -D /tmp/pg -l /tmp/pg.log -o "-c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp/pg -c fsync=off" -w start; \
    export DATABASE_URL="postgresql://postgres@127.0.0.1:5432/postgres"; \
    npm run db:migrate && npm run db:seed && npm run build; \
    "$PGBIN/pg_ctl" -D /tmp/pg -m immediate stop || true

# --- runner: minimal standalone runtime + boot-time schema migration.
FROM node:24-alpine AS runner
WORKDIR /app
# HOSTNAME must be pinned: Docker sets it to the container ID, and the
# standalone server.js binds to process.env.HOSTNAME — binding to the
# container ID would leave the app unreachable.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Local-driver upload root (STORAGE_LOCAL_DIR default `storage/uploads`,
# resolved against cwd). Pre-created + chowned so the non-root user can
# write; docker-compose bind-mounts ./storage over it for persistence.
RUN mkdir -p /app/storage/uploads && chown -R node:node /app/storage
# Full production node_modules FIRST (migrator + postgres for boot-time
# auto-migration), then the traced standalone output merges over it.
COPY --from=deps-prod --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# Boot-time auto-migration needs the migration files + the migrator script.
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/scripts/auto-migrate.mjs ./scripts/auto-migrate.mjs
USER node
EXPOSE 3000
# /api/health returns 200 only when the app can query Postgres. Alpine ships
# busybox wget, which exits non-zero on connection errors AND HTTP 503.
# start-period 60s covers the first-boot migration run.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
# Every container start: apply pending migrations, then boot the server.
CMD ["sh", "-c", "node scripts/auto-migrate.mjs && exec node server.js"]
