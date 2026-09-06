# TripMate v2

High-performance tour & travel agency platform — Hajj/Umrah packages, tours,
flight & visa inquiry, lead generation with landing pages, Meta CAPI tracking,
payments and expense management.

## Stack
Next.js 16 (Turbopack, typed routes) · React 19.2 · TypeScript strict ·
Tailwind CSS v4 · Drizzle ORM + PostgreSQL · Zod · Vitest + Playwright

## Getting started
1. `npm install`
2. `docker compose up -d` (local Postgres — or point DATABASE_URL at Neon)
3. `cp .env.example .env` and fill values — you must set `AUTH_SECRET`
   (`openssl rand -base64 32`); the DATABASE_URL/APP_URL defaults are ready for local dev
4. `npm run db:migrate && npm run db:seed`
5. `npm run dev` → open http://localhost:3000/setup — the wizard creates your
   superadmin and configures storage/SMTP (writes `.env` locally; on Vercel/
   Portainer it shows copy-paste env blocks)

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
- `npm run dev` / `build` / `start`
- `npm run lint` / `typecheck` — hard gates, no ignores
- `npm run test` / `test:e2e`
- `npm run db:generate` / `db:migrate` / `db:seed` / `db:studio` / `db:check`
- `npm run new-module <name>` — module skeleton generator

## Docs
- Architecture spec: `docs/superpowers/specs/2026-09-05-tripmate-v2-design.md`
- UI design system: `docs/superpowers/specs/2026-09-05-ui-design-system.md`
- Implementation plans: `docs/superpowers/plans/`
