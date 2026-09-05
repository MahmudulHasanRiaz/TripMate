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
3. `cp .env.example .env` and fill values
4. `npm run db:migrate && npm run db:seed`
5. `npm run dev`

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
