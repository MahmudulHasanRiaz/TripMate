# TripMate v2 — Plan 3: Content + Catalog + Media Admin + Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The catalog/content/media admin modules (with per-route permission layouts and tag-based cache invalidation), and the NEW public site — home, packages with server-side filters, package detail, services, blog, dynamic pages, seeded static pages, sitemap/robots, dark mode, skip-link, View Transitions — on Next 16's Cache Components architecture.

**Architecture:** Admin modules follow the repo convention (schema✓ from P1 → service.ts + validation.ts + actions.ts with withGuard + nested requirePermission layouts). Public pages are RSC-first: `use cache` + `cacheTag` per spec §7 (tags: `listings`, `listing-{id}`, `posts`, `pages`, `settings`); admin mutations call `revalidateTag`. Storage completes (R2 put/delete) behind the media module's guarded upload action.

**Tech Stack:** existing stack + react-markdown + rehype-sanitize (blog/pages rendering), Next 16 cacheComponents (verify flag per installed docs).

**Spec:** `docs/superpowers/specs/2026-09-05-tripmate-v2-design.md` §3 (modules), §7 (public site + perf model), §15 Plan-3 carry-overs (nested requirePermission, React.cache getSession, as-Route cast removal, FK indexes, raw-hex lint). UI: `docs/superpowers/specs/2026-09-05-ui-design-system.md` — public site sections §3, LP-independent; consult `ui-ux-pro-max` AND `frontend-design` skills for the public design pass (user mandate).

**Plan series position:** Plan 3 of 7. Plans 1-2 merged. Dev DB seeded (6 categories, 3 listings, settings) + superadmin `admin@tripmate.test`/`supersecret123` + setup locked.

## Global Constraints

- TypeScript strict; hard gates; Conventional Commits per task.
- Every server action via withGuard; admin routes gated by NESTED `requirePermission` layouts (root admin layout checks role; each module layout checks its permission — menu hiding is UX only).
- No `dangerouslySetInnerHTML` outside the email template (existing, lint-disabled). Markdown via react-markdown + rehype-sanitize ONLY.
- Public pages: server components; client islands only for interactivity (filters partially, gallery, mobile nav, theme toggle). ZERO client-side data fetching.
- Uploads: authenticated server actions only; type whitelist (image/jpeg, image/png, image/webp, image/svg+xml, application/pdf), 25MB cap, uuid keys, alt text required in library UI.
- Bangla font fallbacks + tokens only; NO raw hex in className (lint rule added Task 1).
- zod@^3, eslint ^9, TS 6.0.3 — no major bumps.
- Dev DB: host PG18 (`.env` in worktree + main both configured with AUTH_SECRET).
- Next-version drift rule: for cacheComponents/`use cache`/View Transitions APIs, READ `node_modules/next/dist/docs` (repo AGENTS.md mandate) and adapt to the installed 16.3.4 — the REQUIREMENTS (tagged caching, admin-save invalidates, no client fetch) are the contract. Document adaptations.
- Scope guard: booking/lead/payment FORMS are Plans 4-5. Plan 3 CTAs link to settings-driven phone/WhatsApp/mailto ONLY. Services pages present the service + contact CTA; the form_config-driven inquiry form lands with leads (Plan 4).

---

### Task 1: Admin groundwork (carry-overs)

**Files:**
- Modify: `src/lib/auth-helpers.ts` (React.cache wrap + remove `as Route` casts where routes now exist), `src/app/(auth)/login/LoginForm.tsx` + `src/lib/auth-actions.ts` (cast removal if unneeded), `eslint.config.mjs` (raw-hex rule)
- Create: nothing else

**Interfaces:**
- Produces: `getSession` memoized per request (React.cache). Lint errors on raw hex in className/style string literals (email template file exempt via existing disable pattern or targeted ignore).

- [ ] **Step 1: React.cache getSession** — wrap the existing `getSession` body: `export const getSession = cache(async (): Promise<Session | null> => { ... })` (import `cache` from react). Verify no behavioral change: typecheck + existing tests/e2e green.
- [ ] **Step 2: Cast cleanup** — remove `as Route` where the target route now exists in the typed-routes manifest (`/login` exists; run `npm run typecheck` — if the manifest doesn't include `/login` because it's in a route group, KEEP the cast and note it). Only remove casts that typecheck cleanly.
- [ ] **Step 3: Raw-hex lint** — append to eslint.config.mjs a rule (in the fence-block style, scoped `files: ["src/**/*.{ts,tsx}"]`):
```js
{
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "Literal[value=/#[0-9a-fA-F]{3,8}/]",
        message: "Raw hex color — use design tokens (bg-primary, text-muted-foreground, ...). UI spec §2.1.",
      },
    ],
  },
  ignores: ["src/modules/email/**"],
},
```
NOTE: this flags ANY hex literal in src (including non-CSS strings). If existing files trip it (email template exempted via ignores; check tests/fixtures), fix those instances to tokens or move the constant out of src. Verify: `npm run lint` green; a probe `style={{ color: "#fff" }}` fails lint, then removed.
- [ ] **Step 4: Gates + commit** — `npm run lint && npm run typecheck && npm run test && npm run test:e2e` green. Commit "feat(admin): request-memoized session, raw-hex lint, cast cleanup".

---

### Task 2: FK/perf indexes migration

**Files:**
- Modify: `src/modules/catalog/schema.ts`, `src/modules/content/schema.ts`, `src/modules/leads/schema.ts`
- Create: `drizzle/0004_*.sql` via generate

**Interfaces:** Produces: indexes — listings(status), listings(categoryId), listings(destinationId), listings(deletedAt) partial? (keep simple: regular), posts(status), posts(categoryId), posts(publishedAt), pages(status), landingPages(status), leads(status), leads(assignedTo), trackingEvents(userId), trackingEvents(anonId), trackingEvents(eventName), orders(status), payments(orderId), expenses(categoryId), expenses(status), sessions(userId), accounts(userId).

- [ ] **Step 1:** Add `index("..._idx").on(...)` to each table's third pgTable arg per list above (drizzle: `(table) => [index("name").on(table.col)]` array form per installed drizzle version — check existing usage/docs).
- [ ] **Step 2:** `npm run db:generate && npm run db:migrate` — migration 0004 creates ~20 indexes.
- [ ] **Step 3:** `npm run typecheck && npm run build` green. Commit "perf(db): FK + status indexes for hot query paths".

---

### Task 3: Cache architecture enablement (spike-then-commit)

**Files:**
- Modify: `next.config.ts`, `src/app/layout.tsx` (or a new providers file) as the docs dictate
- Create: `src/lib/cache-tags.ts`

**Interfaces:**
- Produces: `CACHE_TAGS = { listings: "listings", listing: (id) => \`listing-${id}\`, posts: "posts", pages: "pages", settings: "settings" }`. Cache Components ON (or the installed Next 16.3.4's supported equivalent), build green.

- [ ] **Step 1: READ the installed docs first** — `node_modules/next/dist/docs` (per repo AGENTS.md): find cacheComponents / `use cache` / cacheTag / revalidateTag / PPR status in 16.3.4. Determine: config flag name, directive syntax, whether dynamicIO/PPR flags are needed.
- [ ] **Step 2:** Enable per docs. Create cache-tags.ts. Wire ONE smoke: make `src/app/page.tsx` (placeholder) a cached component (`'use cache'` + `cacheTag(CACHE_TAGS.settings)`) if the docs' pattern allows; verify build output marks it prerendered/cached.
- [ ] **Step 3:** `npm run build && npm run test && npm run test:e2e` green (e2e home still renders). If the flag breaks anything irreparably (documented attempt), RULE: fall back to no flag + plain async server components + `revalidateTag` on mutations with route `revalidate` segments — record ruling in report; the TAG CONTRACT stays identical.
- [ ] **Step 4:** Commit "feat(cache): enable Next 16 cache components + tag registry".

---

### Task 4: Catalog service + validation

**Files:**
- Create: `src/modules/catalog/service.ts`, `src/modules/catalog/validation.ts`, `tests/catalog-validation.test.ts`

**Interfaces:**
- Produces:
  - `listPublishedListings({ search?, categorySlug?, destinationSlug?, minPrice?, maxPrice?, page?, perPage? }) → { items: ListingWithRefs[], total }` (server-only; joins category+destination names; filters status='published', deletedAt null)
  - `getListingBySlug(slug)` (published only, throws/returns null if not found)
  - `listCategories(activeOnly)`, `listDestinations()`
  - Admin: `listAllListings(filters)`, `getListingById(id)`, `upsertListing(input)`, `softDeleteListing(id)`, `upsertCategory`, `softDeleteCategory` (refuse if listings reference it), `upsertDestination`, `softDeleteDestination` (same guard)
  - `validation.ts`: zod schemas — `listingInput` (title, slug slugified-unique, categoryId uuid, destinationId optional, summary ≤300, description markdown, price positive number, currency default BDT, durationDays positive int, rating 0-5, coverImage url-string, gallery array of {url, alt}, itinerary array of {day,title,details}, inclusions/exclusions string arrays, status enum, seo {title?, description?}), `categoryInput`, `destinationInput`

- [ ] **Step 1: TDD validation** — tests/catalog-validation.test.ts: slug auto-generation from title, price rejects negative/zero, rating bounds, gallery url validation, itinerary array shape. RED → implement → GREEN.
- [ ] **Step 2: service.ts** — server-only, drizzle queries with the Task-2 indexes; pagination via limit/offset + count.
- [ ] **Step 3:** typecheck + lint green. Commit "feat(catalog): service + validation layer".

---

### Task 5: Catalog admin CRUD

**Files:**
- Create: `src/app/admin/catalog/layout.tsx` (requirePermission catalog.manage), `src/app/admin/catalog/page.tsx` (redirect to listings), `src/app/admin/catalog/listings/page.tsx` (table + filters), `src/app/admin/catalog/listings/ListingForm.tsx` (client, shadcn form), `src/app/admin/catalog/listings/actions.ts` ('use server': upsert/softDelete via withGuard catalog.manage + revalidateTag(CACHE_TAGS.listings) + listing id tag), `src/app/admin/catalog/categories/page.tsx` + actions, `src/app/admin/catalog/destinations/page.tsx` + actions
- Modify: menu labels if needed (Catalog → children)

**Interfaces:** Produces: full listing CRUD round-trip (create draft → publish → edit → trash), category/destination CRUD with reference guards. Cover/gallery images via existing MediaPicker pattern? — NO, media library is Task 6. Interim: image fields are URL text inputs in the form; Task 8 (or later polish) swaps to MediaPicker. NOTE this in the form as a comment.

- [ ] **Step 1:** Layout + pages + form (react-hook-form + zodResolver with Task-4 schemas; itinerary/inclusions/exclusions as repeatable field arrays; markdown textarea for description).
- [ ] **Step 2:** Actions with revalidateTag. Verify invalidation: dev server, edit a listing title → public JSON? Public pages come Task 9+ — verify via a temporary `console.log` in service + manual re-request, OR defer invalidation proof to Task 15 e2e (document choice).
- [ ] **Step 3:** e2e `tests/e2e/catalog-admin.spec.ts`: login admin → create category "Beach Tours" → create listing (minimal fields, draft) → publish → see in table → soft-delete category refusal (referenced) → trash listing. Commit "feat(admin): catalog CRUD with tagged invalidation".

---

### Task 6: Media library + storage completion

**Files:**
- Modify: `src/modules/media/drivers/r2.ts` (implement put/delete via PutObject/DeleteObject; url from R2_PUBLIC_URL)
- Create: `src/modules/media/service.ts` (list w/ pagination + search, softDelete, getById), `src/modules/media/validation.ts` (accept file meta: name/mime/size; enforce whitelist+cap), `src/modules/media/actions.ts` (requestUploadUrl via withGuard media.manage → returns { key, url } after server-side driver.put(Buffer), record row; deleteFile → driver.delete + softDelete row), `src/app/admin/media/page.tsx` (grid + upload dropzone + alt-text edit + trash), `src/app/admin/media/layout.tsx` (requirePermission media.manage)
- Client upload flow: form POST to a server action with the File (Next server actions accept FormData) — action validates, buffers, driver.put(uuid-key), inserts media_files row. 25MB cap enforced server-side.

**Interfaces:** Produces: upload works on BOTH local (public/uploads, served statically) and R2 (when configured); library grid with search; alt editing; soft-delete. `getUploadUrl(key)` helper for consumers (PackageCard images use stored url).

- [ ] **Step 1:** TDD: validation (mime whitelist, size cap, key shape). RED → GREEN.
- [ ] **Step 2:** R2 put/delete + service + actions (withGuard media.manage; rateLimit 20/min on upload).
- [ ] **Step 3:** Admin UI (dropzone component; grid; alt edit inline). Local-driver e2e: `tests/e2e/media-admin.spec.ts` — upload a tiny generated PNG (Buffer in test via request context? Use playwright `page.setInputFiles` with a fixture file created in tmp), see it in grid, edit alt, trash it. Commit "feat(media): library + dual-driver upload".

---

### Task 7: Content service + validation + pages seed

**Files:**
- Create: `src/modules/content/service.ts`, `src/modules/content/validation.ts`, `src/modules/content/seed-static-pages.ts` (script or part of db:seed), `tests/content-validation.test.ts`
- Modify: `src/db/seed.ts` (add static pages + post categories if absent)

**Interfaces:**
- Produces: posts CRUD-ready service (listPublished with pagination, bySlug, admin list/upsert/softDelete; publishedAt handling), postCategories CRUD, pages service (bySlug published, admin CRUD). Pages sections model v1: `[{ type: "markdown", content: string }]` — ONE section type now; LP section system extends it in Plan 4. `pageInput` zod: title, slug, sections (min 1 markdown), seo, status.
- Seed adds pages: about-us, faq (sections with Q&A markdown), terms-of-service, privacy-policy — content adapted from Plan-1-era seeds (in git history of old src/lib/actions.ts @d83f262^ if you want the text; otherwise write fresh 2-paragraph versions).

- [ ] **Step 1: TDD validation** (sections shape, slug, status). Step 2: services. Step 3: seed update + run (idempotent — new pages only insert if slug absent). Step 4: typecheck/lint/test green. Commit "feat(content): service + static page seeds".

---

### Task 8: Content admin CRUD

Same shape as Task 5 (requirePermission content.manage): posts (title, slug, excerpt, markdown body, featured image URL input, category select, status, publishedAt auto on publish), post categories, pages (title, slug, markdown sections editor — simple textarea per section + add/remove). revalidateTag(posts/pages). e2e: create+publish a post, edit a seeded page's markdown, verify actions wired. Commit "feat(admin): content CRUD".

---

### Task 9: Public design system pass (THE design task)

**Files:**
- Create: `src/components/site/SiteHeader.tsx` (client island: sticky, scroll-shrink, blur, mobile sheet nav, theme toggle), `src/components/site/SiteFooter.tsx` (server: settings-driven links + socials + theme toggle fallback + newsletter placeholder), `src/components/site/SkipLink.tsx`, `src/components/site/SectionHeading.tsx`, `src/components/site/ThemeToggle.tsx` (client: toggles `.dark` on html + localStorage; no FOUC — inline script in layout head reading localStorage before paint), `src/components/site/PackageCard.tsx` (server), `src/components/site/BlogCard.tsx` (server), `src/components/site/CTASection.tsx` (server), `src/components/site/FaqAccordion.tsx` (client island), `src/components/site/Gallery.tsx` (client: lightbox)
- Create: `src/app/(public)/layout.tsx` — public route group: SkipLink + Header + main + Footer; fonts already in root layout
- Modify: `src/app/page.tsx` moves INTO the group (delete root page, create `(public)/page.tsx`)

**Process (MANDATORY):** consult `frontend-design` skill AND `ui-ux-pro-max` for the aesthetic direction BEFORE writing components; follow UI spec §2-§3 exactly (tokens, SectionHeading kicker pattern, one primary CTA per viewport, 44px targets, prose styles for markdown via a `.prose-tripmate` token-based style block in globals.css — NO @tailwindcss/typography dep, hand-roll minimal prose styles with tokens). View Transitions: wire `<ViewTransition>`-per-installed-docs on route changes in the public layout (or the documented equivalent; if the API needs a config flag, enable it).

**Interfaces:** Produces: the public chrome + shared components every later task consumes. Dark mode full support (toggle + prefers-color-scheme default). e2e: header nav works, mobile sheet opens, theme toggles (html.dark class), skip-link focuses main.

- [ ] **Step 1:** skills consult → 1-paragraph aesthetic note in report. **Step 2:** components + layout + prose styles. **Step 3:** e2e `tests/e2e/public-chrome.spec.ts` (nav, theme, skip-link, 375px mobile via viewport fixture). Commit "feat(site): public chrome + design system components".

---

### Task 10: Home page

`src/app/(public)/page.tsx` — server, cached (`use cache` + tags settings/listings/posts): hero (settings.home: headline, sub, image, CTA → /packages), ServiceGrid (6 categories → link or redirect_url external), featured packages (3 published, PackageCard), StatsBand (static copy v1), blog teasers (3 posts), CTASection (phone from settings.site). No user fetches. e2e: home renders hero + 3 package cards (from seed) + service grid. Commit "feat(site): home page".

---

### Task 11: Packages listing + detail

- `(public)/packages/page.tsx` — server; URL-state filters (`?q=&cat=&dest=&max=&page=`) via searchParams; server-side filtering through Task-4 service; filter bar = client island syncing URL (no fetch); skeleton-free (streaming Suspense for grid). Cached per filter-key.
- `(public)/packages/[slug]/page.tsx` — server, cached tag `listing-{id}` + listings; generateMetadata (title/seo/description); generateStaticParams for published listings? (with cacheComponents, follow docs; if static params conflict, dynamic render + tag); Gallery island; itinerary accordion (server-rendered details/summary — no JS needed); inclusions/exclusions lists; sticky booking sidebar: price, duration, **CTA = phone + WhatsApp deep link + "Enquire by email" (mailto with subject)** — booking form lands Plan 5 (scope guard). notFound() for unknown slug.
- e2e: filter by category changes grid; detail page shows itinerary; unknown slug → custom 404. Commit "feat(site): packages listing + detail".

---

### Task 12: Services + blog + dynamic pages

- `(public)/services/[slug]/page.tsx` — category landing: hero image, description (markdown), featured listings in that category (if package kind), CTA block (phone/WhatsApp). inquiry_based services: contact CTA + "what we need from you" checklist rendered from category description; form itself = Plan 4 (scope guard noted in page comment). redirect kind: hero + external CTA button (target _blank rel noopener).
- `(public)/blog/page.tsx` + `[slug]/page.tsx` — list w/ pagination; post page: react-markdown + rehype-sanitize, prose styles, featured image, author name (join users), publishedAt format.
- `(public)/p/[slug]/page.tsx` — renders pages.sections markdown blocks; generateMetadata from seo; used by seeded about/faq/terms/privacy. FaqAccordion for the faq page's Q&A markdown (parse simple `## Q` / answer pattern OR keep markdown — keep markdown prose v1, accordion in Plan 4 LP polish).
- e2e: blog list + post render; about-us page renders seeded markdown; services page (tour) shows category listings. Commit "feat(site): services + blog + dynamic pages".

---

### Task 13: sitemap + robots + 404 polish

- `src/app/sitemap.ts` — home, /packages, /services (per category), /blog, published listings + posts + pages, priorities per spec-ish; `src/app/robots.ts` — allow all, disallow /admin, /account, /api, /setup; sitemap ref. `not-found.tsx` polish (public chrome context, suggested links). Verify: `/sitemap.xml` + `/robots.txt` render correct XML/txt in dev. Commit "feat(seo): sitemap + robots".

---

### Task 14: Loading/error states + perf verification

- `loading.tsx` for (public) routes (skeleton grid matching card aspect), `error.tsx` for public group (friendly, retry). Lighthouse-style check: run `npm run build` — confirm public routes prerendered/cached per Task 3's mode; page-weight sanity (no >200KB images unoptimized — next/image with sizes everywhere). Document findings in report. Commit "feat(site): loading + error boundaries".

---

### Task 15: Plan-level e2e + full gate

- [ ] Full flow e2e `tests/e2e/public-flows.spec.ts`: home → package card → detail → back → filter → blog → post → about-us → theme toggle persists across nav → 404.
- [ ] Admin→public invalidation e2e (the Task-5 deferred proof): login → edit seeded listing title (admin) → visit /packages → NEW title visible (may need cache revalidation — with cacheComponents + revalidateTag this should just work; if it needs a build, document ruling).
- [ ] FULL GATE: `npm run lint && npm run typecheck && npm run build && npm run test && npm run test:e2e` ×2 (idempotency).
- [ ] README: public site section (routes, caching model, how to add a listing). Commit "test(e2e): public flows + invalidation — plan 3 complete".

---

## Verification Checklist (plan-level acceptance)

- [ ] Admin: every /admin/catalog|content|media route has nested requirePermission layout (probe: staff can access catalog but not users; customer none)
- [ ] Upload: whitelist enforced (probe .exe rejected), 25MB cap, uuid keys, works local + R2 config path
- [ ] Public: zero client fetch (grep useEffect+fetch in (public) — none), all pages server-cached with tags, admin edit invalidates
- [ ] a11y: skip-link, focus ring, aria on accordion/sheet/toggle; 375px pass
- [ ] Dark mode: toggle + no-FOUC + persists
- [ ] sitemap.xml/robots.txt correct; markdown sanitized (no dangerouslySetInnerHTML outside email)
- [ ] Full gate green twice
