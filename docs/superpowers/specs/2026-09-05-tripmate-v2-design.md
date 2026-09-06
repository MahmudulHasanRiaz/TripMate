# TripMate v2 — Architecture Design Spec

**Date:** 2026-09-05
**Status:** Approved in brainstorming session (sections 1-6)
**Repo:** TripMate, modernized in-place (NOT a rewrite from zero)
**Purpose:** Senior-engineer-grade, high-scalability, super-fast starter for a tour & travel agency (Hajj/Umrah/tour/flight/visa services) with lead generation + Meta CAPI.

---

## 1. Goals & Non-Goals

### Goals
- Next.js 16.x full superpowers: Turbopack (dev+build), Cache Components (`use cache`, `cacheLife`, `cacheTag`), PPR, typed routes, `proxy.ts`, React 19.2 (View Transitions, `<Activity>`).
- PostgreSQL replaces Firestore. Fresh data start + seed.
- Two business flows: (a) Landing-page builder → lead capture → lead management → conversion to orders; (b) public service booking → payment.
- Hybrid sales model: package-type services = fixed-price online booking; variable services (flight/visa/passport) = inquiry → staff quote → confirm.
- Expensive live services (e.g. live flight search) = frontend showcase + admin-managed + third-party redirect; in-house later.
- Customer portal (accounts, order tracking, payment history, document upload).
- Full Meta Pixel + CAPI event system with dedup.
- Maximum automation: dev/deploy automation, business workflow automation, module interconnection (zero manual duplicate data entry).
- Dual deploy: Vercel + Neon primary; Docker/Portainer VPS-ready from the same repo.
- Security: nothing private/secure may ever be exposable.

### Non-Goals (v1)
- AI chatbot (dropped; provider-agnostic API route can be added later).
- SSLCommerz/bKash/Nagad automatic gateways (v2+; plugin architecture prepared).
- Bengali/Arabic UI translations (English only; i18n-ready structure).
- Firestore data migration (fresh start).
- Live flight search / visa APIs in-house.

---

## 2. Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | Next.js 16.x | Turbopack default, Cache Components, PPR, typed routes, `proxy.ts` |
| UI runtime | React 19.2 | View Transitions, `<Activity>` |
| Language | TypeScript strict | Build errors NEVER ignored |
| Styling | Tailwind CSS v4 | CSS-first `@theme` config; no `tailwind.config.ts` |
| Components | shadcn/ui | Admin reused; public site new design on same primitives |
| Database | PostgreSQL | Neon on Vercel; docker-compose postgres on VPS |
| ORM | Drizzle | Schema = TS files, migrations in git, zero-runtime |
| Auth | Better Auth | httpOnly cookie sessions, Drizzle adapter, roles+permissions |
| Validation | Zod | Forms + server actions + env — shared schemas |
| Email | nodemailer + react-email | ANY SMTP provider |
| Storage | Driver pattern | `LocalDriver` + `R2Driver`; configurable at setup + changeable in settings |
| Tracking | Own Meta CAPI module | Direct Graph API calls, server-side |
| Testing | Vitest + Playwright | Unit + E2E |

---

## 3. Folder Structure (module-based)

```
src/
├── app/                      # routes only — thin, no logic
│   ├── (public)/             # home, packages, services, blog, pages
│   ├── (auth)/               # login/register/reset
│   ├── account/              # customer portal
│   ├── admin/                # admin panel (server-gated layout)
│   ├── l/[slug]/             # landing pages (ad-friendly short URL, no site chrome)
│   └── api/                  # webhooks (payments), health, og-image
├── modules/                  # domain logic — every module SAME shape
│   ├── leads/
│   ├── bookings/
│   ├── payments/
│   ├── catalog/
│   ├── content/
│   ├── media/
│   ├── settings/
│   ├── users/
│   ├── tracking/
│   ├── email/
│   └── expenses/
├── components/               # ui/ (primitives), site/, admin/
├── db/                       # drizzle client, seed, migrations
└── lib/                      # env (zod-validated), auth session, cache helpers, guard.ts
```

**Module convention** (this IS the code-generation/convention automation):
every module = `schema.ts` (Drizzle tables) + `service.ts` (all DB queries, server-only) + `actions.ts` (`'use server'` + auth guard + Zod) + `validation.ts` + `components/` where needed.

Payments substructure: `payments/gateways/{driver.ts, manual/, paylater/, sslcommerz/}`.

---

## 4. Core Conventions (enforced)

1. **Server-first.** Default = server component. `'use client'` never queries the DB directly; all reads via RSC/server actions.
2. **Env validated at boot** with Zod. Missing env = app fails at start, not runtime. Complete `.env.example`.
3. **All mutations via server actions**: Zod validation + role check + `revalidateTag` in one place, wrapped in `withGuard(action, { permission, rateLimit })` from `lib/guard.ts`.
4. **Service layer**: pages/actions never write Drizzle queries directly; they call `service.ts`. Testable, reusable.
5. **Lint + TS hard gates in build.** `ignoreBuildErrors`/`ignoreDuringBuilds` banned forever.
6. **DB fenced** with `server-only` package — importing db into a client bundle = build failure.
7. `dangerouslySetInnerHTML` banned (lint error). Markdown via react-markdown + rehype-sanitize.
8. Tables snake_case; `id uuid` (gen_random_uuid); `created_at`/`updated_at`; soft-delete (`deleted_at`) only for content/media/landing_pages; status + event logs for leads/orders.

---

## 5. Data Model (PostgreSQL)

All tables: `id uuid pk`, `created_at`, `updated_at` unless noted.

### users (domain table; Better Auth owns session/account/verification)
```
name, email (unique), phone, role enum(superadmin,admin,staff,customer),
status, avatar_url, permissions text[] (null = role default; array membership is cheaper to query than jsonb),
lead_id? (trace if converted from lead)
```

### catalog
```
service_categories: name, slug, kind enum(package, inquiry_based, redirect),
                    redirect_url?, icon, sort_order, is_active
  # 6 services: Tour, Hajj, Umrah, Medical, Flight, Visa/Passport
  # kind=package → fixed-price listing; inquiry_based → order form; redirect → third-party

listings: category_id fk, title, slug (unique), summary, description,
          cover_image jsonb, gallery jsonb, video_url, destination_id?,
          duration_days?, rating?, price numeric(12,2), currency,
          itinerary jsonb, inclusions jsonb, exclusions jsonb,
          form_config jsonb (custom form fields for inquiry services),
          status enum(draft,published,archived), seo jsonb, deleted_at?

destinations: name, slug, image
```

### leads
```
landing_pages: title, slug (unique), sections jsonb (template array: type/order/content),
               form_config jsonb, seo jsonb, status,
               fb_content_id? (CAPI content tagging), deleted_at?

leads: landing_page_id?, listing_id?, source enum(landing, organic, manual),
       name, email?, phone, message?, form_data jsonb,
       status enum(new,contacted,qualified,negotiating,converted,lost),
       assigned_to → users.id?, converted_order_id?, score, notes

lead_events: lead_id, type, payload jsonb, actor_id, created_at
  # every status-change/note/call-log = event → audit trail
```

### bookings (orders)
```
orders: order_no (human-readable, e.g. TM-2026-0001, unique), user_id?,
        customer_snapshot jsonb (name/phone/email frozen at order time),
        listing_id?, listing_snapshot jsonb (price/title frozen),
        type enum(package, inquiry),
        status enum(pending,in_review,quoted,confirmed,cancelled,completed),
        quoted_price numeric?, final_price numeric?, currency, special_requests,
        source enum(website, lead_conversion, manual), lead_id?, created_by?

order_status_events: order_id, from_status, to_status, note, actor_id

travelers: order_id, name, passport_no?, dob, relation
```

### payments
```
payment_gateways: name, logo_url, kind enum(manual, sslcommerz, bkash, nagad),
                  config jsonb, instructions?, is_active, sort_order
  # manual gateway config: account number/phone/type — set in setup wizard + admin settings
  # API-gateway secrets NEVER in DB — env-only

payments: order_id, gateway_id, amount numeric, currency,
          status enum(pending,submitted,verified,rejected,refunded),
          method_txn_id?, sender_number?, submitted_screenshot_url?,
          verified_by?, note
```

### content + media + settings
```
posts / post_categories: blog — slug, content (markdown), seo jsonb, author_id
pages: dynamic pages — slug, sections jsonb (reuses LP section system), seo jsonb
media_files: name, disk enum(local,r2), path, url, mime, size, alt, deleted_at?
settings: key (pk), value jsonb — site, home, SMTP, storage, Meta CAPI, setup status
```

### tracking
```
tracking_events: anon_id? (cookie-generated), session_id?, user_id?,
                 event_name, source_url, referrer?, fb_params jsonb (_fbp/_fbc),
                 capi_status, capi_response?, created_at
  # server log of CAPI call results — debugging + dedup audit
```

### expenses
```
expense_categories: name, kind enum(operational, cost_of_sales, other),
                    description, is_active

expenses: category_id fk, amount numeric(14,2), currency, date, description,
          vendor?, receipt_url? (media-library linked), order_id? (cost of specific order),
          created_by, status enum(pending, approved, rejected),
          approved_by?, approved_at?
```

### Design principles in the model
- Lead ↔ order bidirectional trace (`leads.converted_order_id` + `orders.lead_id`). No manual customer entry anywhere.
- `customer_snapshot` / `listing_snapshot` jsonb = history never breaks when profile/price changes.
- `lead_events` + `order_status_events` = free audit trail.
- Lead conversion auto-creates user account if none + links.

---

## 6. Auth + Roles + Permissions + Security

### Better Auth
- Server-only `lib/auth.ts`: drizzleAdapter, email+password, httpOnly secure sameSite cookie, 30d expiry, cookieCache 60s.
- Login by email only (no username enumeration path).

### Enforcement (role NEVER comes from client)
1. `/admin/*` + `/account/*` layouts are server components calling `auth()` per request; unauthorized → redirect. Client checks are UX only, never security.
2. EVERY server action's first line = `requireRole('admin')` / `requirePermission('leads.manage')` via `withGuard` wrapper. No unguarded mutation exists; lint rule enforces.
3. Public actions (lead submit, booking, contact): Zod strict + rate limit + honeypot.

### Roles & permissions
```
roles: superadmin | admin | staff | customer
permission keys (module-based):
  catalog.manage, orders.manage, orders.view, leads.manage, leads.view,
  payments.verify, payments.manage_gateways, content.manage, media.manage,
  users.manage, settings.manage, tracking.view, expenses.submit, expenses.approve
```
- Role → default permission set mapped in code. `users.permissions` (text[]) overrides per user (grant one extra permission without role change).
- Admin user-edit form shows permission matrix checkboxes. Only superadmin gets `users.manage`.
- superadmin = setup/danger-zone access, hardcoded role check in code (DB role change cannot unlock).

### Threat model table
| Threat | Defense |
|---|---|
| SQL injection | Drizzle parameterized; raw SQL banned by convention |
| XSS | react-markdown + rehype-sanitize; `dangerouslySetInnerHTML` lint-banned |
| CSRF | Better Auth origin check + Server Actions same-origin |
| Session hijack | httpOnly+secure+sameSite, 30d expiry, bcrypt (Better Auth default), admin password min 10 chars |
| Lead spam | IP sliding-window rate limit (10/min, 100/h per form) + honeypot + Zod |
| Upload abuse | Uploads only via authenticated server actions (admin: any library file; customer: own documents with ownership check); type whitelist (image/pdf), 25MB cap, mime sniff, uuid keys |
| Enumeration | Uniform login errors; email-only login |
| Env leak | Secrets in `server-only` modules; NEXT_PUBLIC_ only safe values (site URL, pixel ID) |
| PII exposure | Public pages never receive users.email/phone; server components select explicit columns, never `table.*` |
| Setup wizard abuse | Route disabled after `settings.setup_complete`; no per-request middleware fetch |
| Wizard env-write abuse | Fixed-path atomic writer, key whitelist, active only while setup unlocked; private values never echoed (boolean configured-state only) |
| CAPI token / payment secrets | env-only; DB stores public display data only |
| Rate limiter storage | In-memory (VPS single instance) / Upstash Redis (Vercel) — env-driven switch |

---

## 7. Public Site

Routes: home, `packages/` (server-side filter via URL state `?search=&cat=`), `packages/[slug]`, `services/[slug]` (inquiry-form-centric), `blog/` + `blog/[slug]`, `p/[slug]` (dynamic pages — also renders seeded static pages: about/faq/terms/privacy ship as `pages` rows so they stay admin-editable), `sitemap.ts`, `robots.ts`, `not-found`, `error`.

Performance model:
- All public pages PPR + Cache Components: instant static shell, dynamic holes streamed.
- `use cache` + `cacheTag` — content tags `listing-{id}`, `settings`, `posts`. Admin save → `revalidateTag('listing-123')` → public page fresh in ms.
- `next/font` self-hosted, next/image, zero client fetch waterfalls. LCP < 1.5s target.
- Small client islands only: forms, gallery zoom, mobile nav.

---

## 8. Landing Page Builder + Lead Flow

- URL `/l/[slug]` — short, ad-friendly, no site header/footer.
- 11 section templates (v1): hero (image/video bg), benefits, package-showcase (embeds catalog listings), gallery, testimonials, faq, countdown, sticky-cta, whatsapp-cta, form, thank-you-redirect.
- `form_config jsonb` field definitions; admin UI = section list (reorder/add/remove) + section-type picker + live preview (SAME render component as public — no divergent preview logic).
- Lead flow (fully automatic): submit (guarded action) → insert lead → auto-assign (round-robin staff rotator, configurable) → emails (customer receipt + assigned staff) → CAPI Lead event → thank-you state.
- Admin lead inbox: kanban board, timeline (lead_events), convert button → order form pre-filled (lead → order in two clicks). Auto-creates customer account + links if none.

---

## 9. Meta CAPI + Pixel

- Pixel (client): site-wide `fbq` init; PageView auto; ViewContent (listing/LP visit); InitiateCheckout.
- CAPI (server): `tracking/capi.ts`, server-only.
- Events: Lead (server, on lead action), Contact (server), InitiateCheckout, Purchase (server, on payment verified — source of truth for ad reporting).
- Dedup: shared `event_id` between pixel and CAPI (client generates, passes to server action).
- `_fbp`/`_fbc` captured client-side, sent with form submit; server logs to tracking_events + calls Graph API with sha256-hashed email/phone. CAPI fire-and-log — lead insert NEVER blocked by CAPI failure.
- Admin config: Pixel ID, CAPI access token (env), Test Event Code, event status log view (from tracking_events).

---

## 10. Order Flow + Payments

- Package-type: package page → booking form (travelers) → order `status=in_review` → payment step (gateway pick) → admin verify → confirmed.
- Inquiry-type: service form → order `type=inquiry, status=pending` → admin inbox → staff quote (`quoted_price`) → customer sees in portal → payment → confirm.
- Payment methods v1: manual (trx id + screenshot submit), pay-later. v2+: SSLCommerz etc. via same driver interface.
- Guest path via `customer_snapshot`; portal login auto-links by phone/email match.
- Order creation fires CAPI InitiateCheckout; verified payment fires Purchase.
- Human-readable `order_no` (TM-2026-0042).
- Gateway plugin pattern: `driver.ts` interface (`initiatePayment`, `verify`); new gateway = new folder + DB row; no other code changes.
- Manual verification page: submitted list (trx, screenshot preview, sender) → one-click verify/reject with note → status chain + email + CAPI Purchase. All behind `payments.verify`.

## Customer portal (`/account`)
Dashboard (order summary) / my orders (status timeline, quote approval) / payment history (screenshot upload, receipt download) / my documents (passport scans etc., via admin-guarded upload endpoint) / profile.

## Expenses module
- Categories (operational / cost_of_sales / other) + entries (amount, date, vendor, receipt via media library, optional order link).
- Approval flow: staff submits, admin approves (`expenses.submit` / `expenses.approve`).
- Reporting in admin dashboard with REAL data: P&L view (period picker; revenue = verified payments; costs = approved expenses; net), category breakdown (bar chart), service-level margin (revenue minus order-linked expenses), all SQL-aggregated (SUM/GROUP BY) — never client-side row downloads.

---

## 11. Admin Panel

```
admin/
├── (dashboard)   # real KPIs: today's leads/conversions, order status grid,
│                 # pending manual-payment queue, expense summary, P&L widget
├── leads/        # kanban + list, detail + timeline + convert
├── orders/       # board + detail + quote + status manage
├── payments/     # verification queue + gateway config
├── expenses/     # categories + entries + approval + reports
├── catalog/      # categories/listings/destinations CRUD
├── content/      # posts/categories/pages
├── landing-pages/# LP builder
├── media/        # library
├── users/        # role + permission matrix
└── settings/     # site/home/SMTP/storage/CAPI/setup status
```
Menu items permission-filtered. Server-gated layout. shadcn UI reused.

---

## 12. Setup Wizard (first-run browser initialization)

**Core principle: private values = env file, public settings = DB, NEVER echoed back to the browser.**

### Config classification
- **env-only (private):** `AUTH_SECRET`, R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`), SMTP credentials (`SMTP_HOST/PORT/USER/PASS/FROM`), `META_CAPI_ACCESS_TOKEN`. These are NEVER stored in the database.
- **DB settings (public/safe):** site name, logo, favicon, phone/address, storage driver CHOICE (`local` | `r2`), Meta Pixel ID, social links.
- **Hybrid:** the "use R2" decision lives in DB settings; R2 secrets live in env.

### Three deployment scenarios
| Scenario | Behavior |
|---|---|
| Local / VPS (writable filesystem) | Wizard writes private values directly to `.env` (atomic write, only touched keys modified), inputs are `type=password`, values never echoed after submit |
| Vercel | Env immutable — wizard detects per-key: present in `process.env` → "✓ configured"; missing → copy-paste-ready KEY=VALUE block + platform-dashboard instructions + "Re-check" button (app re-detects) |
| Portainer/Docker | Same detection; instructions: add keys to stack env → restart container → Re-check |

### Env-write mechanics (writable scenarios)
- `lib/env-file.ts` (server-only): fixed-path atomic `.env` writer (temp file + rename), whitelist of allowed keys only, no path traversal possible.
- After write: env cache invalidated so storage/email modules hot-read new values immediately. Boot-time values (AUTH_SECRET) show a final notice: "restart once for full effect".
- `AUTH_SECRET`: auto-generated securely by the wizard when env is writable (user types nothing); on immutable platforms a copy-block with a generation command.
- Storage step: `local` (zero-config, volume-backed) selected by default; R2 optional — selecting it opens credential fields + connection-test button.
- SMTP step: credential fields + test-email button (works in both scenarios — sends through provided values directly).
- Wizard route public UNTIL superadmin exists, then permanently locked (`settings` key `setup` = `{ setupComplete: true }`).

### Steps
1. Environment check (per-key detect: DB ✓/needed, AUTH_SECRET, storage, SMTP, Meta) — shows what's already configured vs needed
2. Superadmin account (email + strong password; email normalized lowercase)
3. Site identity (name, logo, favicon → DB)
4. Storage driver (local default | R2 + credentials + test)
5. SMTP (credentials + test-email)
6. Meta Pixel + CAPI (skippable)
7. Seed data (optional) → Complete → lock

**Guarantee:** a saved private value NEVER appears in any JSON/HTML response — only boolean `configured` state. Env-write actions active only while setup is unlocked.

---

## 13. Automation & Deployment

**Dev automation:**
- `npm run setup` — env check → create DB → migrate → seed → dev server. One-command onboarding.
- `npm run new-module <name>` — module skeleton generator.
- GitHub Actions CI: lint + typecheck + unit + build (Postgres service container). PR merge blocked unless green.

**Deploy (two paths, one repo):**
- Vercel: git push → auto deploy; Neon DB; env zod-validated at boot.
- VPS/Portainer: multi-stage Dockerfile (standalone output, non-root), docker-compose (app + postgres + volumes), env file mounted, volume-persistent local media. Zero code changes between targets.

**Email templates (react-email, SMTP-agnostic):** lead-received, lead-assignment, order-confirm, quote-ready, payment-verified, payment-rejected, expense-approval, welcome.

---

## 14. Testing Strategy

- Unit (Vitest): service layer functions, validation schemas, guard wrapper, CAPI payload builder.
- E2E (Playwright): golden paths — setup wizard, lead submit → admin convert → order → manual payment verify, booking flow, permission denials.
- CI runs both; DB via service container.

---

## 15. Migration Path (in-place)

This repo is modernized in place:
1. Phase 0: strip dead code (`src/api/`, `src/next.config.ts`, genkit, `.modified`, stale blueprint), fix configs.
2. Phase 1: stack upgrade (Next 16, React 19.2, TS strict, Tailwind v4) + folder restructure + env/lint gates.
3. Phase 2: DB layer (Drizzle + schema + migrations + seed).
4. Phase 3: auth + guards + admin shell + setup wizard + email foundation (SMTP transport + send util — Plans 4-5 consume it; no-op fallback when SMTP unset). Must also close two Plan-1 final-review findings: (a) ESLint `no-restricted-imports` rule banning `@/db/connection` outside `src/db/**` + `scripts/**` (makes the server-only fence toolchain-enforced, not convention-only); (b) `src/instrumentation.ts` calling `getEnv()` in `register()` so env truly validates at server boot, not first DB touch.
5. Phase 4: catalog/content/media modules + public site RSC.
6. Phase 5: leads + LP builder + tracking (CAPI).
7. Phase 6: orders + payments + expenses + portal.
8. Phase 7: email templates + notification flows + dashboard reports (builds on the Phase-3 email foundation).
9. Phase 8: CI + Docker + docs + starter polish + `npm run setup` one-command onboarding + Upstash rate-limit switch docs.

**Plan 2 final-review carry-overs (binding for the named plans):**
- Plan 3: every `/admin/<module>` route gets its own `requirePermission` in a nested layout (menu hiding is UX, module layout is the gate — do not inherit the role-only root check); wrap `getSession` in `React.cache()` for per-request dedup; drop the now-unneeded `/login as Route` casts; decide Pixel ID placement — spec §12 says DB/public settings but code writes `META_PIXEL_ID` to env; public pages need it client-side, so either `NEXT_PUBLIC_META_PIXEL_ID` or the settings row — decide before the pixel ships (Plan 4).
- Plan 5: when customer self-registration is deliberately enabled, add the §6 guard stack (rate limit + honeypot) to `sign-up/email`; revisit cookieCache role-staleness for admin demotions.
- Plan 6 (settings admin page, NEW from P3-T13 review): the `searchEngineVisibility` flag is currently inert (no UI sets it false). Plan 6's settings page must add the toggle AND wire it: (a) gate `(public)` metadata noindex on it, (b) robots.ts `Disallow: /` when false, (c) sitemap.ts empty when false. Robots-only honoring is a half-measure — all three parts ship together.
- Plan 7: define sendEmail's failure contract (return vs throw) before lead/order flows consume it; template authors must use react-email components (escaped) — never concatenate user data into `bodyHtml`; flip `RUN_DB_INTEGRATION` on in the isolated-Postgres CI job.
- Plan 8 (launch gate): wizard claim hardening — SETUP_TOKEN claim secret and/or auto-lock; non-root Docker user must own `.env` and uploads dir (isEnvWritable probe + public/uploads writability).

**Plan 3 final-review carry-overs (binding):**
- Plan 4: swap admin form image URL text inputs for a MediaPicker (library-backed); blog-data doc comment cleanup (unimplemented slug-tag claim).
- Plan 5: media "empty trash" feature — hard-delete objects via driver.delete (currently dead code; soft-deleted rows accumulate).
- Plan 6 (settings page, extends the P3-T13 item): every settings save calls updateTag(CACHE_TAGS.settings); home page gets generateMetadata (marketing title/description); normalize existing DB seo-titles that still carry the "| TripMate" suffix.
- Plan 7: SVG upload hardening (serve with sandbox/content-disposition or off-origin host — same-origin SVG executes script if navigated directly); admin pages-list pagination beyond 50; verify client-JS island budget against the ~226KB/page transfer figure; consolidate cross-module duplication (escapeLike/slug-recovery/action-utils ×3) once module count stabilizes; STORAGE_LOCAL_DIR custom-dir URL footgun guard.

Existing admin UI pages and shadcn components are adapted during their phase; the old Firebase-era data layer and client-fetch pages are replaced, not preserved.

---

## 16. Related Documents

- UI Design System spec: `docs/superpowers/specs/2026-09-05-ui-design-system.md` (separate — anyone can redesign the UI from it alone)
- Implementation plans: `docs/superpowers/plans/` (Plan 1: Foundation committed; Plans 2-7 written when reached, per the series map in Plan 1's header).
