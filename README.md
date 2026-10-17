# TripMate v2

High-performance tour & travel agency platform — Hajj/Umrah packages, tours,
flight & visa inquiry, lead generation with landing pages, Meta CAPI tracking,
payments and expense management.

## Stack
Next.js 16 (Turbopack, typed routes) · React 19.2 · TypeScript strict ·
Tailwind CSS v4 · Drizzle ORM + PostgreSQL · Zod · Vitest + Playwright

## Getting started
```bash
npm install
docker compose up -d   # local Postgres (or point DATABASE_URL at Neon)
cp .env.example .env   # set AUTH_SECRET — `openssl rand -base64 32`
npm run setup          # env check → db check → migrate → seed
npm run dev            # → http://localhost:3000
```
First run ever? Open http://localhost:3000/setup — the wizard creates your
superadmin and configures storage/SMTP (writes `.env` locally; on Vercel/
Portainer it shows copy-paste env blocks).

> **Storage = R2 builds need `R2_PUBLIC_URL`.** When the wizard selects R2,
> uploaded images are served from the operator's custom domain bound to the
> bucket. `next.config.ts` reads `R2_PUBLIC_URL` at build time to whitelist that
> host for `next/image` optimization — so a production build (Vercel project env
> / Docker build arg) must have `R2_PUBLIC_URL` set, or R2-hosted imagery 400s on
> the public site. Local dev reads it from `.env` like the other R2 credentials.

## Auth
Session auth runs on better-auth with four roles: superadmin, admin, staff and
customer. The first user — your superadmin — is created by the setup wizard;
everyone then signs in at `/login`. Role-gated routes (e.g. `/admin`) enforce
permissions server-side, and the admin menu is filtered to the signed-in role.

## Public site
The customer-facing site lives in `src/app/(public)`: server-rendered with zero
client-side data fetching, and every DB read flows through Next Cache
Components (`'use cache'`), so pages are fast and admin edits appear without a
redeploy or manual purge.

Routes:

| Route | Shows |
| --- | --- |
| `/` | Home — hero, featured packages, service links |
| `/packages` | Full package catalog; filter/sort/search via query string (`?cat=`, `?q=`) |
| `/packages/[slug]` | One package — price, itinerary, gallery, "Enquire" CTA |
| `/services/[slug]` | Service landing pages (`tour-packages`, `flight-tickets`, …) |
| `/blog` | Published posts |
| `/blog/[slug]` | One post — markdown prose, author, date |
| `/p/[slug]` | Evergreen markdown pages (`about-us`, `faq`, …) |
| `/robots.txt`, `/sitemap.xml` | Generated SEO files |

Caching model:

- **Cache Components.** Each route's reads sit in a per-route data module
  (`src/app/(public)/*/_lib/*-data.ts`) whose functions are `"use cache"` scopes
  tagged with `cacheTag(...)` and given a `cacheLife` profile. Detail routes
  stream inside `<Suspense>` under a PPR shell.
- **Tags are the contract.** `listings` (catalog grids), `listing-<id>` (one
  package), `posts` (blog index + a post), `pages` (evergreen pages), `settings`
  (brand/contact/hero copy). The tag registry is `src/lib/cache-tags.ts`.
- **Admin edits invalidate.** Every catalog/content/static-page save calls
  `updateTag(...)` on the affected tag, so the next public read re-renders fresh.
  Example: editing a listing's title expires `listings`; publishing a post
  expires `posts`.

Adding content:

- **Listing / package** — create in `/admin/catalog`; it appears on `/packages`
  and in the home featured band while under the cap.
- **Blog post** — write a markdown post in `/admin/content/posts` and publish;
  it shows on `/blog` and its detail route immediately.
- **Static page** — add markdown in `/admin/content/pages`; served at
  `/p/<slug>`.
- **A brand-new public route** — add a page under `src/app/(public)` and give it
  a tagged `'use cache'` data module; register any new revalidation tag in
  `src/lib/cache-tags.ts` and fire `updateTag` from the admin mutation that
  changes that data.

## Commands
- `npm run setup` — one-command onboarding (env + db check → migrate → seed)
- `npm run dev` / `build` / `start`
- `npm run lint` / `typecheck` — hard gates, no ignores
- `npm run test` / `test:e2e` (add `RUN_DB_INTEGRATION=1` before `test` for the live-DB suites — they run serially)
- `npm run db:generate` / `db:migrate` / `db:seed` / `db:studio` / `db:check` / `seo:clean-titles`
- `npm run new-module <name>` — module skeleton generator

## CI
GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR — path-aware,
**quality** (typegen, lint, typecheck, migrate+seed against a Postgres
service, production build, unit tests) and **integration** (full live-DB
suite with `RUN_DB_INTEGRATION=1`, then the Playwright e2e suite) with
failure artifacts. Both jobs must be green to merge. CI is smart: a `changes` diff gate skips install/build/tests for docs/asset-only pushes (jobs still report green), superseded runs on the same branch are cancelled, and npm/Playwright/Next caches are reused.

## Rate limiting (optional multi-instance)
Public form guards default to a per-process sliding window (fine for local
dev and a single Docker container). Set `UPSTASH_REDIS_REST_URL` +
`UPSTASH_REDIS_REST_TOKEN` to route limits through Upstash Redis — a shared
fixed window across all serverless instances (see `src/lib/rate-limit.ts`).

## Docs
- Architecture spec: `docs/superpowers/specs/2026-09-05-tripmate-v2-design.md`
- UI design system: `docs/superpowers/specs/2026-09-05-ui-design-system.md`
- Implementation plans: `docs/superpowers/plans/`

## Deploy (Docker / Portainer)

One `docker-compose.yml`, two modes, split by Compose profiles:

- `docker compose up -d` — local dev Postgres only (the default, unchanged).
- `docker compose --profile app up -d --build` — Postgres **plus** the
  production app image at http://localhost:3000.

No build args are needed — and the image build is fully self-contained: the
builder starts a throwaway Postgres internally to prerender the public-site
cache (with Cache Components, `next build` executes the `'use cache'` data
scopes, so it needs a migrated+seeded DB; your real databases are never
touched). The one exception to "no args": with R2 storage, `next.config.ts`
must whitelist the CDN host for `next/image` at build time — build with
`--build-arg R2_PUBLIC_URL=https://cdn.example.com`.

Configuration resolves from `.env` next to the compose file
(`cp .env.example .env`, fill real values). **Inside the stack the database
host is the service name `postgres`, not `localhost`** —
`postgresql://postgres:postgres@postgres:5432/tripmate`. Compose already
defaults `DATABASE_URL` to that, so a dedicated deploy `.env` only needs
`AUTH_SECRET` (32+ chars, or the app exits at boot with the exact error) and
`APP_URL`. Running the app profile next to a *dev* `.env` (which points
`DATABASE_URL` at `localhost:5432`)? Override it on the command:
`DATABASE_URL=postgresql://postgres:postgres@postgres:5432/tripmate docker compose --profile app up -d --build`.

**Schema auto-migrates on every (re)deploy.** The runner image applies pending
`drizzle/` migrations at container start (`scripts/auto-migrate.mjs`, the same
runtime migrator Vercel uses at build time) before the server boots — over
`DATABASE_URL_MIGRATE` when set, else `DATABASE_URL` (a transaction-pooler URL
— port 6543 / `?pgbouncer=true` — in either slot fails the boot fast with an
actionable error; port 5432 direct and session pooler are DDL-safe). Fresh
deploys and Portainer redeploys therefore push schema changes
automatically; re-runs are no-ops unless a new migration file was committed,
and the run is verified against `drizzle/meta/_journal.json` before the server
starts. `SKIP_DB_MIGRATE=1` opts out (with a loud drift warning). Migrations
only create/alter tables — they never seed demo content, so on
a fresh database create the superadmin once at `/setup`. Health: the
container self-checks `GET /api/health`
(200 only when Postgres answers; the payload reports `migrationsPending`) —
`docker compose --profile app ps`. Uploaded
media persists in the bind-mounted `./storage` directory across rebuilds.

**Portainer** — Stacks → Add stack: either paste `docker-compose.yml` in the
Web editor (the web editor has no build context, so build/push an image first
and change `build: .` to `image: your-registry/tripmate`) or use the
Repository method pointing at the git repo, where `build: .` builds on the
host. In both cases paste your `.env` values into the stack's Environment
variables (advanced mode) — the same `${...}` substitutions run there; set
`DATABASE_URL` with host `postgres` as above. Postgres data lives in the
`tripmate_pgdata` volume and uploads in the `./storage` bind mount, so
re-deploys keep both.

## Deploy — Vercel (serverless + Supabase)

Schema-on-deploy is wired into the repo: `package.json` defines
`vercel-build`, so every Vercel build runs `scripts/auto-migrate.mjs` first
(applies the committed `drizzle/` migrations with the runtime migrator — no
drizzle-kit needed) and only then `next build`. That order is required: with
Cache Components, `next build` executes the public `'use cache'` data scopes,
so the schema must already exist in the database before the build can
prerender pages.

1. **Create the Vercel project** (framework: Next.js). `vercel-build` is
   picked up automatically; no `vercel.json` or Build Command override needed.

### Deploy env (Vercel + Supabase)

| Variable | Value | Required for auto-migration? |
| --- | --- | --- |
| `DATABASE_URL` | Supabase **Transaction pooler**, port **6543** (`*.pooler.supabase.com`). Runtime + build — serverless-friendly, no session cap (`src/db/connection.ts` connects with `prepare: false`). | Yes — runtime; not used for DDL |
| `DATABASE_URL_MIGRATE` | DDL-capable connection, port **5432**: Supabase **direct** (`postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres`) **or session pooler** (`postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`). Used ONLY by `scripts/auto-migrate.mjs`. **FORBIDDEN: transaction pooler `:6543` / `?pgbouncer=true`.** | **Yes — required.** Without it, a transaction-pooler-only config fails the build fast with an actionable error |
| `SKIP_DB_MIGRATE` | Unset by default. `1` = escape hatch that skips auto-migration for a deploy (prints a loud drift warning). | No — leaving it set disables the guarantee |
| `APP_URL` | Production URL, e.g. `https://tripmate.vercel.app`. | — |
| `AUTH_SECRET` | 32+ chars (`openssl rand -base64 32`). | — |
| Optional | `SMTP_*`, `STORAGE_DRIVER=r2` + `R2_*` (also `R2_PUBLIC_URL`, read at build time), `UPSTASH_REDIS_*`. | — |

**Transaction-pooler URLs fail fast.** Port **6543** or `?pgbouncer=true` in
`DATABASE_URL_MIGRATE` (or in `DATABASE_URL` when the migrate var is missing)
aborts the build with the exact fix instead of a cryptic mid-build DDL error.
Port **5432** works either way: the direct connection and the session pooler
(`aws-0-<region>.pooler.supabase.com:5432`) both give DDL-capable sessions.
Non-Supabase configs (Docker/Neon/local) keep the old fallback to
`DATABASE_URL`.

2. **Deploy / re-deploy.** Pending migrations apply automatically first
   (over `DATABASE_URL_MIGRATE`); the build then verifies applied rows against
   `drizzle/meta/_journal.json` — a mismatch fails the build naming the missing
   migrations. Re-deploys are no-ops unless a new migration file was committed.
3. **First deploy only:** open `<APP_URL>/setup` once to create the
   superadmin and base site settings. Demo catalog rows are NOT seeded on
   Vercel — add real packages under `/admin`.
4. **Prove it migrated:** `curl <APP_URL>/api/health` → `migrationsPending: 0`.

Notes:

- **Journal `when` values must be strictly increasing** (real epoch millis).
  drizzle's migrator applies a journal entry only when its `when` is greater
  than the single max `created_at` already recorded — a hand-faked,
  non-monotonic `when` makes later migrations SILENTLY SKIP on databases that
  already applied a later-timestamped entry (the auto-migrate verification
  fails the build when this happens). Always generate with `npm run
  db:generate`; if hand-authoring, stamp current epoch millis. Enforced by
  `tests/journal-when-monotonic.test.ts` + the partial-state integration test.
- Migrations are recorded in `"drizzle"."__drizzle_migrations"`, so re-runs
  are safe. If a preview and a production deploy race, both apply the same
  files — acceptable for a single-operator project; for a team, move the
  migrate step to CI on `main` instead.
- The role in both URLs must own the schema (CREATE/ALTER rights). Use the
  project postgres role, not a read-only/anonym key.
- If the Supabase schema was created earlier with `drizzle-kit push` (no
  migration journal), the first auto-migrate errors on existing tables —
  point `DATABASE_URL_MIGRATE` at a fresh database or baseline the journal
  first.
- Previews share the production `DATABASE_URL`; only create schema changes in
  branches after the matching migration file is committed, otherwise the
  preview build cannot prerender pages that query the new tables.
