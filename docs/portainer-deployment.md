# Deployment Runbook — TripMate (Portainer)

> **Source of truth for VPS deploys.** TripMate builds its own image on the
> Docker host — there is no CI/push pipeline and no registry involved: Portainer
> pulls the git repo and runs `docker compose up -d --build`
> (`docker-compose.portainer.yml`).

## 1. How deployment works

```
Portainer (Stacks → Add stack → Repository)
  ├─ Repository URL : https://github.com/MahmudulHasanRiaz/TripMate
  ├─ Compose path   : docker-compose.portainer.yml   ← NOT docker-compose.yml
  └─ Environment    : required AUTH_SECRET + APP_URL (+ optional vars)
        │
        ▼
  docker compose up -d --build        (runs on the Docker host)
        │
        ├─ postgres   : initializes with POSTGRES_*  (named volume tripmate_pgdata)
        └─ app        : derives DATABASE_URL from POSTGRES_* at boot
                        → auto-migrates drizzle/ → serves on APP_PORT
```

**The whole flow is: correct env vars + NGINX domain → Deploy → `/setup` once.**
Redeploys pull the latest `main` and rebuild — that is the entire update process.

## 2. Repo map (deploy surface)

| File | Role |
|---|---|
| `docker-compose.portainer.yml` | The stack file for Portainer/VPS. No profiles → deploy starts **both** Postgres and the app. |
| `docker-compose.yml` | Local dev only (`docker compose up -d` = dev Postgres; app behind `--profile app`). A stack pointed at this file would start **only Postgres**. |
| `portainer/portainer-stack.json` | Portainer custom-template defaults: every stack env var with labels/⭐ and defaults. |
| `.env.example` | Every variable, with behavior notes and paste-ready samples (last section: "Portainer stack"). |
| `scripts/auto-migrate.mjs` | Boot-time migrator (runs before the server). Fail-fast on non-DDL-capable URLs; verifies against `drizzle/meta/_journal.json`. |
| `scripts/derive-db-url.mjs` | Builds `DATABASE_URL` from `POSTGRES_USER/PASSWORD/DB` when it is empty (internal DB). Percent-encodes; never logs the value. |
| `tests/portainer-compose.test.ts` | Guards this runbook: compose renders, profile gating, required vars, ports/credentials reach both services, template ↔ compose env sync. |

**Env-sync rule (test-enforced):** compose `${...}` variables, `.env.example`
and `portainer/portainer-stack.json` must list the same variables — changing one
means changing all three **in the same commit**.

## 3. First deploy

1. Stacks → Add stack → Build method: **Repository**.
2. Repository URL: `https://github.com/MahmudulHasanRiaz/TripMate`.
   Compose path: `docker-compose.portainer.yml`.
3. Environment variables (advanced mode):

| Variable | Note |
|---|---|
| `AUTH_SECRET` | **Required.** `openssl rand -base64 32` (32+ chars). Stack refuses to deploy without it. |
| `APP_URL` | **Required.** The URL users open — `https://<domain>` behind NGINX, else `http://<ip>:<APP_PORT>`. |
| `APP_PORT` | App host port (default 3000). Pick a free one if the server hosts other stacks. Postgres takes no host port — internal network only. |
| `POSTGRES_DB` / `POSTGRES_PASSWORD` / `POSTGRES_USER` | Internal DB, set **once**. The app derives its connection from these. |
| `DATABASE_URL` (+`DATABASE_URL_MIGRATE`) | External DB only; leave empty otherwise. |
| SMTP / R2 / Meta / Upstash | Optional; see `.env.example` for samples. |

4. Deploy → wait for **healthy** → open `<APP_URL>/setup` once to create the
   superadmin (migrations create the schema; they never seed content).
5. NGINX: proxy `https://<domain>` → `http://<docker-host>:<APP_PORT>` and set
   `APP_URL=https://<domain>`.

## 4. Everyday operations

```bash
# Health (also what the container healthcheck hits)
curl -s https://<domain>/api/health     # {"ok":true,"db":true,"migrationsApplied":N,"migrationsPending":0}

# Update: Portainer → Stack → Editor: re-pull/redeploy (or re-save the stack).
#   Redeploy = git pull latest main + rebuild + boot-time auto-migration.

# Backup database (volume: tripmate_pgdata). Compose names containers
# <stack>-postgres-1 — discover the exact name instead of guessing:
PG=$(docker ps -q --filter label=com.docker.compose.service=postgres | head -1)
docker exec "$PG" pg_dump -U <POSTGRES_USER> -Fc <POSTGRES_DB> > backup_$(date +%Y%m%d_%H%M%S).dump

# Backup uploads (volume: tripmate_uploads)
docker run --rm -v tripmate_tripmate_uploads:/data -v "$PWD":/out alpine \
  tar czf /out/uploads_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

- Migrations only create/alter tables; re-runs are no-ops (verified at boot).
- `SKIP_DB_MIGRATE=1` is an escape hatch, not a workflow (loud drift warning).
- Volumes survive stack deletion unless removed explicitly. **Deleting
  `tripmate_pgdata` destroys the database.**
- Keep the **same stack name** on every redeploy: it is the compose project
  name, the prefix of containers (`<stack>-postgres-1` / `<stack>-app-1`) and
  of volumes (`<stack>_tripmate_pgdata`). A rename creates a second, parallel
  copy — the old containers keep their host ports and the old volume gets
  orphaned. Pinned `container_name`s are gone for exactly this reason.

## 5. Troubleshooting (seen in practice)

| Symptom | Cause → fix |
|---|---|
| Stack deploys but only Postgres appears | Compose path points at `docker-compose.yml` (app is behind the `app` profile) → use `docker-compose.portainer.yml`. |
| `Bind for :::5433 failed: port is already allocated` at deploy | The current stack file publishes **no** Postgres port — this error means an **older stack's** postgres container (from before the port was dropped, or from a differently-named duplicate stack) is still running and holding 5433, while its `restart: unless-stopped` keeps resurrecting it. Fix: Portainer → Stacks → delete every TripMate stack except the current one; Containers → remove leftover `tripmate-*` / `*_postgres` containers (`docker ps --filter publish=5433` names the holder when you have SSH); redeploy the one remaining stack. |
| `AUTH_SECRET is required` / `APP_URL is required` at deploy | Exactly what it says — paste the missing variable (Portainer env, advanced mode). |
| App restarts in a loop, logs mention `ECONNREFUSED`/auth for DB | `POSTGRES_*` changed **after** the volume was initialized (volume keeps the original credentials) → revert, or recreate the volume (destroys data), or `ALTER USER` inside the old DB. |
| App log: `caused by: getaddrinfo EAI_AGAIN postgres` (or `ENOTFOUND postgres`) | The app container cannot see a `postgres` service on its network — leftover state from earlier deploys (orphan containers / deleted network from a renamed or deleted stack; the boot retry proves it is not transient). Confirm: `docker ps -a --filter name=tripmate --format 'table {{.Names}}\t{{.Status}}\t{{.Networks}}'` (or Portainer → Containers — check the Stack column) — if no `*-postgres-1` container exists, or `*-app-1` sits on a different network: `docker rm -f $(docker ps -aq --filter name=tripmate)` then `docker network rm $(docker network ls -q --filter name=tripmate)` (**named volumes are not touched — data survives**), delete duplicate stacks in Portainer (keep ONE), redeploy. |
| Login/links point to `localhost` | `APP_URL` still the default or the dev `.env` value → set the public URL and redeploy. |
| Migrator logs `FATAL: ... cannot run migrations (6543...)` | External DB given a transaction-pooler URL → set `DATABASE_URL_MIGRATE` to the direct or session-pooler (`:5432`) URL. |
| Health `pending > 0` | A new migration shipped but the container boot didn't run — check the container log for `[auto-migrate]`; redeploy. |
| Uploads 404 after redeploy | Uploads live in the `tripmate_uploads` **volume** — never bind-mount `./storage` on the Portainer stack. |
| Setup wizard saves don't stick | On Portainer the stack env is the source of truth (the container cannot rewrite it) — change variables in Portainer and redeploy. |

## 6. Secrets inventory

| Where | What |
|---|---|
| Portainer stack env | `AUTH_SECRET`, `APP_URL`, `POSTGRES_PASSWORD`, SMTP, R2, Meta, Upstash (see `portainer/portainer-stack.json`). |
| GitHub | Nothing — private `.env*` files are gitignored; the repo holds no secrets. |
| NGINX host | TLS certificates, proxy config. |
