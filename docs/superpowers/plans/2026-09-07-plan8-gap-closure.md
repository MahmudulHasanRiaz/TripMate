# TripMate v2 — Plan 8: Gap-Closure Order (2026-09-07)

You are the principal full-stack product engineer and technical owner for the TripMate application.
The full repository is provided at `E:\Custom Web Projects\TripMate`.

## 0. CONTEXT

The previous v2 production-grade order (the 98-section spec) was executed and committed
(`c87e4b0`, migration `0007_lethal_deathstrike.sql`). An independent audit compared the
implementation against that order and produced the gap list below. This order closes those
gaps. It does NOT redo work that already satisfies the spec.

Already verified as done (do not rebuild):
- Theme/brand system: template picker + custom color tokens + live preview + reset + save
  (`ThemeCustomizer`, `theme.ts`, `theme-service.ts`, dynamic CSS injection in public layout).
- Package direct booking checkout with gateway selection, manual payment submission fields,
  and Pay Later (`BookingForm` -> `createPackageOrderAction`).
- Manual + Pay Later payment gateway config, admin verify/reject chain, order payment-status
  sync (`syncOrderPaymentStatus`), CAPI events.
- Visa services + service options admin CRUD, public `/visa` explorer + inquiry -> leads.
- Decoupled SEO drawer on listings + posts; setup wizard demo/production choice; demo/prod
  seeders with asset download into application storage; expense module; media library +
  MediaPicker on listings; dashboard KPIs; orders/expenses/portal UI; Docker/CI.

## 1. WORKING RULES

1. Read `docs/superpowers/plans/` and `docs/superpowers/specs/` first. Follow existing module
   architecture (`src/modules/*`), Drizzle schema + migrations, server actions with `withGuard`,
   cache tags, and the settings system. Do not create parallel systems.
2. Every schema/data-model change must be migration-backed (`npm run db:generate` + inspect +
   `db:migrate` on a scratch DB) and preserve existing data.
3. All user-facing public + admin UI stays server-rendered first; client islands only where
   interaction requires them. Sensitive math (cost, profit, payment, order state) stays
   server-side.
4. No hardcoded provider URLs, no hardcoded demo/fake business numbers, no hardcoded contact
   details in public components — everything configurable comes from DB/settings.
5. Do not reduce scope. Do not over-engineer. No new dependencies unless justified.
6. Run and pass before finishing: `npm run lint`, `npm run typecheck`, `npm test`,
   `npm run build`, and `npm run test:e2e` (spin up Postgres via `docker compose` or CI as the
   repo already supports). Record evidence for every claim.
7. No "TODO / later plan" comments for functionality this order requires; no placeholder copy on
   live public screens unless it is admin-configurable.

## 2. GAPS TO CLOSE

### WP1 — Quotation system end-to-end (spec §39, §27 "quoted", §50 SALES, §96 ADMIN, §89)
Tables `quotations` + `quotation_items` already exist (`src/modules/bookings/quotations-schema.ts`)
but there is NO service, NO validation/actions, NO admin UI, NO lead->quote->approval->order
flow, NO email, NO seed.
Deliver:
- Quotation service + Zod validation in `src/modules/bookings/` following `orders` module style.
- Admin quotation manager (`/admin/quotations`): create from a lead/customer, line items
  (description, qty, unit price, optional unit cost), auto totals + gross profit, discount/notes,
  validity date, status lifecycle `draft -> sent -> accepted/rejected -> converted`; convert an
  accepted quote into an order (reuse `orders` with `source=lead_conversion`, snapshot line items,
  link `converted_order_id`); staff audit trail.
- Quote list/detail UX matching admin shell; status changes recorded; email on send/accept.
- Public/lead-facing: acceptance state exists so agency can record customer approval.
- Seed 1-2 demo quotes only in demo mode; tests (service + validation + convert flow).

### WP2 — Visa types must be admin-manageable (spec §11, §18, §89-12)
Actions `saveVisaTypeAction/deleteVisaTypeAction` exist but no UI can call them.
Deliver:
- Admin "Visa Types" manager (tab in `CatalogNav`, page under `/admin/catalog/visa-types`):
  create/edit/delete/activate-deactivate/reorder, slug auto, icon, description.
- Public + admin views consume the same `visa-service` reads; deletion guarded when services
  reference a type (soft-disable instead).
- Tests for type CRUD and slug collision handling.

### WP3 — Passport / service options must be orderable by customers (spec §17, §89-11, §69)
`service_options` have admin CRUD but no public selection/order path. `/services/[slug]`
renders generic static checklist for `inquiry_based`.
Deliver:
- Public service option selection: on `/services/[slug]` for an `inquiry_based` category with
  active options (e.g. Passport 5-year/10-year), show options (title, price, duration, delivery,
  requirements) with a "Book this option" path that creates a real order (type `inquiry`, with
  option snapshot + traveler/customer info + payment selection consistent with `BookingForm`).
- If a category has options, hide the generic static checklist; if it has none, keep inquiry form.
- Admin order detail shows the selected options; dashboard/orders queries include option revenue.
- Tests for option ordering + price/cost snapshot.

### WP4 — Flight/Hotel redirects must come from admin config, never hardcoded (spec §13, §14, §91, §65)
`TravelActionPanel` defaults to `google.com/travel` + `booking.com` and the homepage never passes
redirect props.
Deliver:
- Homepage/layouts pass the admin-configured `redirectUrl` of the redirect categories
  (Flight, Hotel) into `TravelActionPanel` from the catalog read (same source the services grid
  already uses).
- Remove the hardcoded default URLs + placeholder phone fallbacks; when a redirect URL is unset
  the tab either hides or routes internally to `/services/{slug}` — never an external hardcoded
  host.
- Keep the external-link notice + `rel=noopener`; validate protocol on save (https only for
  public unless explicitly overridden).

### WP5 — Destinations: full admin model + public pages (spec §12, §45, §52-54, §56, §83)
Migration added `description/sort_order/is_featured/seo` but `DestinationFormDialog` only edits
name/slug/image (raw URL text), and there is no public `/destinations/[slug]`.
Deliver:
- Admin destination editor: description, sort order, featured toggle, media via `MediaPicker`
  (reuse library; not raw URL), and the decoupled `SeoConfigDrawer` (same pattern as listings).
- Public `/destinations/[slug]`: editorial page with image, description, packages (from
  listings.destinationId) + visa services for that destination, breadcrumbs, SEO metadata with
  fallbacks, JSON-LD (see WP8).
- Homepage `PopularDestinations` must honor `is_featured` + `sortOrder`, show real package
  counts/starting prices, link to the destination page, and remove hardcoded copy
  ("All 40+ destinations", "Curated Packages & Visas").
- Seed destination content incl. descriptions/SEO in demo mode; tests.

### WP6 — Customer portal completion (spec §29, §69, §96 BUSINESS)
`/account` root is still the stale "Customer portal arrives in Plan 5" placeholder; portal is
not reachable from site navigation.
Deliver:
- Real portal dashboard at `/account`: active/recent orders with status + payment balance
  (total/paid/outstanding), quick links to orders/documents, profile summary.
- Profile view/edit (name, phone, email, address) where schema allows.
- Payment history on order detail is already present; add a portal "Payments" overview if cheap.
- Add persistent public navigation to the portal ("My bookings / Sign in") in `SiteHeader` and a
  footer link; sign-in state aware.
- Remove stale placeholder text/comments on `/account`.

### WP7 — Homepage content + real numbers (spec §41-49, §72, §98, §65, §44)
Homepage still ships hardcoded marketing copy and fake stats ("12+ years, 25,000+ travellers")
with a comment deferring real aggregates.
Deliver:
- Make homepage section content admin-configurable via the existing `settings.home` (or a small
  structured `homepage` content record): hero (already), trust band copy/figures, featured
  section heading/lead, concierge copy, final CTA copy, testimonials.
- Featured packages must use the `is_featured` flag (fallback to recent when none flagged), not
  blind `slice(0,3)`.
- Replace fake StatsBand numbers: either real aggregates from DB (orders served, destinations,
  years from settings) or clearly configurable via settings with safe defaults; never invent
  traveller counts.
- Add a testimonials block backed by content (seed testimonials in demo); keep RSC + `use cache`
  + cache tags so admin edits update the public site without redeploy.
- Remove "later plan" comments from homepage/footer components.

### WP8 — Structured data (spec §55, §54, §53, §96 SEO)
No JSON-LD exists anywhere despite the implementation plan claiming it.
Deliver:
- JSON-LD: Organization/LocalBusiness from site settings on the root layout/home;
  Product/Offer (price, currency, availability) on `/packages/[slug]`; Article on `/blog/[slug]`;
  BreadcrumbList on detail pages; canonical + OG tags with fallbacks (seoTitle/seoDescription/
  summary/image). Never emit misleading data. Tests for output presence/values on fixtures.

### WP9 — Demo/media integrity (spec §8, §20, §68, §65, §91)
- The demo seeder assigns a YouTube (rickroll) URL as a package `videoUrl` — replace with a
  self-hosted mp4 provisioned through the same download-to-storage asset pipeline, or remove
  video from that package and rely on the gallery. Public runtime must not embed third-party
  media for demo records.
- Remove now-unused `images.pexels.com` / `placehold.co` entries from `next.config.ts`
  `remotePatterns` (or justify each remaining entry); confirm zero third-party hosts referenced
  by public runtime code.
- Confirm every demo asset is downloaded into configured storage (`local`/`r2`) with
  `media_files` rows and stored URLs; make all demo entity sections idempotent (safe re-runs)
  and verify by running `db:seed:demo` twice on a scratch DB.
- Optional: email templates currently hardcode brand hex (`#0E5E5A`) — derive from theme/site
  settings server-side so admin branding reaches email without per-template edits.

### WP10 — Admin shell completeness (spec §50, §96 ADMIN)
- `/admin/users` is linked in `ADMIN_MENU` but the route does not exist (404) — either build the
  users manager or remove/hide the entry until built.
- Add Quotations to the admin menu (WP1) and a Customers entry backed by portal users when the
  user list exists; group items per the §50 workflow (Overview / Customers / Sales / Products /
  Content / Finance / Integrations / Settings) where it improves operator flow without breaking
  permission filtering.
- No menu item may 404.

### WP11 — Verification & report (spec §88, §89, §90, §96, §97)
- Run the §89 25-flow list explicitly and record pass/fail + evidence (screenshots/DB rows) for
  each, including: demo vs prod seed, theme change visibility, service create/reorder, flight/
  hotel redirect (now configured), package direct order, passport option order (WP3), visa type
  config (WP2), gateway select + MFS instruction change, manual submission -> admin queue,
  verify/reject state updates, Pay Later, cost/profit math, order balance, decoupled SEO,
  public SEO metadata, media reuse, customer portal visibility (WP6).
- Verify public pages at 375/390/768/1024/1280/1440+ with no horizontal overflow, keyboard
  navigation, visible focus, accessible dialogs/tabs/carousels (axe pass on key pages).
- Final report must follow spec §97 with all 23 items, including E2E result,
  deployment compatibility status (Vercel + Supabase/Neon + R2, Docker/Portainer), remaining
  limitations, and genuinely required future work (e.g. direct gateway/GDS extension points).
- Do not claim any feature works unless it was implemented and tested with recorded evidence.

## 3. DELIVERABLE ORDER

Implement WP1-WP10 in dependency order (WP1/WP2/WP3/WP5 carry schema or UI additions; WP4/WP6/
WP7/WP8/WP10 build on existing modules; WP9 fixes seed/media), then run WP11 and produce the
final §97 report. Commit logically per WP with migration + tests included.

## 4. FINAL PRINCIPLE

Close every gap against the original 98-section order. The result must be coherent from admin ->
database -> backend -> public site -> customer -> order -> payment -> operations -> reporting,
with every configurable visual driven by real configuration and every business number coming
from real data.
