# TripMate v2 — production image (Plan 7, T7). Multi-stage build that ships
# the Next.js standalone server (node:20-alpine runtime, non-root).
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

# --- deps: full dependency install (dev deps included — the builder needs
# the Next/Turbopack + drizzle-kit/tsx toolchain; they never reach the runner).
# Pinned to the same alpine minor as the builder so native musl binaries
# (sharp etc.) installed here run unchanged one stage later.
FROM node:20-alpine3.20 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: compile the standalone output.
# Pinned to alpine3.20 so the embedded-postgres package name (postgresql16)
# stays valid across future node:20-alpine rebases.
FROM node:20-alpine3.20 AS builder
WORKDIR /app
# postgresql16 = server + client (initdb, pg_ctl land in /usr/libexec/
# postgresql16/ — NOT on PATH; the RUN below uses explicit paths).
RUN apk add --no-cache postgresql16 && chown node:node /app
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
    PGBIN=/usr/libexec/postgresql16; \
    "$PGBIN/initdb" -D /tmp/pg -U postgres -E UTF8 --no-locale; \
    "$PGBIN/pg_ctl" -D /tmp/pg -l /tmp/pg.log -o "-c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp/pg -c fsync=off" -w start; \
    export DATABASE_URL="postgresql://postgres@127.0.0.1:5432/postgres"; \
    npm run db:migrate && npm run db:seed && npm run build; \
    "$PGBIN/pg_ctl" -D /tmp/pg -m immediate stop || true

# --- runner: minimal standalone runtime.
FROM node:20-alpine AS runner
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
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
# /api/health returns 200 only when the app can query Postgres. Alpine ships
# busybox wget, which exits non-zero on connection errors AND HTTP 503.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
