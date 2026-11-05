#!/bin/sh
# Container boot sequence — the image CMD (see Dockerfile). Replaces the old
# inline `sh -c` chain so the boot steps stay readable and testable:
#
#   1. DATABASE_URL derivation — when the operator did NOT set DATABASE_URL
#      (internal-database compose/Portainer deploy), derive it from
#      POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB so the app and the bundled
#      Postgres always agree. Unset everywhere → stays empty and the migrator
#      fails fast with its actionable message.
#   2. Apply pending migrations BEFORE serving (fail fast: a failed migration
#      exits the boot with the migrator's code, exactly like the old
#      `auto-migrate && server` chain — a half-migrated schema never serves).
#   3. Start the standalone server, then converge the cache (FU-31):
#      scripts/boot-revalidate.mjs waits for /api/health and asks the app to
#      expire the cache generation the Docker build baked from its baseline
#      seed + build env, so public pages render from the RUNTIME database/env
#      with no manual admin Settings save. Best-effort by design: a failure
#      logs a loud warning and serving continues with the pre-FU-31 fallback
#      (baked entries expire naturally / on the next settings save) — the
#      convergence step must never take a healthy server down.
#   4. Wait on the server. SIGTERM/SIGINT are forwarded to it so
#      `docker stop` shuts the app down gracefully (this script, not the
#      server, is PID 1 now — previously the CMD used `exec node server.js`).
DERIVED_DB_URL="$(node scripts/derive-db-url.mjs)"
if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL="$DERIVED_DB_URL"
fi
export DATABASE_URL

node scripts/auto-migrate.mjs || exit $?

node server.js &
server_pid=$!

trap 'kill -TERM "$server_pid" 2>/dev/null' TERM
trap 'kill -INT "$server_pid" 2>/dev/null' INT

node scripts/boot-revalidate.mjs ||
  echo "[boot] WARNING: boot-time cache convergence did not complete — public pages may serve the build-baked cache until it expires or an admin saves settings." >&2

wait "$server_pid"
