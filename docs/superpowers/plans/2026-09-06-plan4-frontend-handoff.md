# TripMate v2 — Plan 4 Frontend Build Order (LEADS + LANDING PAGES + META TRACKING)

> For the frontend implementation agent. **Read this entire file before writing any code.** It is your complete requirements doc. The Plan-4 BACKEND (services/actions/CAPI/email — everything non-UI) is ALREADY BUILT and verified on this branch; you build the UI layer that consumes it. Then the controller reviews your work and may issue change orders.

**Repo (run everything here):** `E:\Custom Web Projects\TripMate\.claude\worktrees\nervous-pike-900e52` (branch `claude/nervous-pike-900e52` — the Plan-4 backend is committed here. Pull first if the branch moved: `git pull`.)
**Stack:** Next.js 16.3.4 (cacheComponents ON — do NOT touch caching config), React 19.2, TypeScript strict, Tailwind v4 design tokens ONLY (no raw hex — the linter enforces it; the only sanctioned hex file is `theme-colors.ts` at repo root), shadcn/ui (existing primitives in `src/components/ui/`), lucide-react icons, zod@^3 (v3 only), react-hook-form for complex forms. Use `npx shadcn@latest add <x>` ONLY for genuinely new primitives you need; most exist.

**MANDATORY design process:** invoke the `frontend-design` AND `ui-ux-pro-max` skills before building (project mandate). Follow `docs/superpowers/specs/2026-09-05-ui-design-system.md` — §5 admin patterns (quiet, dense, 44px targets, status colors success/warning/info + accent-text tokens, live-region errors), §3 public + a11y §7 + perf §8. Bengali-market product: phone + WhatsApp contact CTAs are load-bearing.

## The backend contract you consume (exact names — already implemented & typechecked)

Read these files for exact types before coding:

- **Landing pages** — `src/modules/landing-pages/`
  - `section-types.ts` (PURE — safe to import in client): `SECTION_TYPES` (11), `CONTENT_FIELDS: Record<SectionType, {key,label,kind}[]>` (drives builder config forms), per-type zod config schemas, `LANDING_FORM_FIELD_TYPES`, `LandingFormField`, `formConfig` shape, `buildLeadSchema(formConfig)`.
  - `service.ts` (server-only): `getPublishedLandingBySlug(slug)` → `LandingRenderData | null` = `{id, slug, title, seo, fbContentId, sections: ResolvedSection[], form: {formConfig, landingSlug}}`. **packageShowcase sections are pre-resolved by the backend into `{id,slug,title,price,currency,coverImage,durationDays,destinationName}` card payloads** — render those, do not re-query.
  - `actions.ts` (server actions, guard content.manage + relay `{ok}|{ok:false,code,error}`): `saveLandingPageAction(input)`, `setLandingStatusAction(id,status)`, `trashLandingPageAction(id)`; all revalidate tags — after ok call `router.refresh()` (never manual fetch).
- **Leads** — `src/modules/leads/`
  - `service.ts` (server-only, call from RSC pages): `listLeads({status?,assignedTo?,search?,page?,perPage?})`, `getLeadDetail(id)` (incl `events` timeline + `formData` + `landingTitle` + `assignedToName`), `getLeadBoardCounts()` → `{new,contacted,qualified,negotiating,converted,lost,total}`, `listStaffUsers()`.
  - `actions.ts` (guard leads.manage, relay): `changeLeadStatusAction(id,status)`, `assignLeadAction(id,assigneeId|null)`, `convertLeadAction(id)`, `updateLeadNoteAction(id,note)`. Also `submitLead` (public, used by the /l form). Lead status values: `new, contacted, qualified, negotiating, converted, lost`.
- **Meta/Tracking** — `src/modules/tracking/actions.ts`: `getMetaConfigStatus()` → `{envWritable, pixelConfigured, capiTokenSet, testCodeSet, pixelId?, settings}` (token NEVER exposed), `saveMetaConfig({pixelId?,capiAccessToken?,testEventCode?})` → `{ok:true,status?} | {ok:true,copyBlock,instructions} | {ok:false,error}`. `service.ts`: `listTrackingEvents({page?,eventName?,capiStatus?})`, `getTrackingEventCounts()`, plus `CapiEventName` + `CAPIC_EVENT_NAMES` from `lib.ts`.
- Email/lead templates & CAPI are server-side only — you do NOT call them; they fire automatically inside `submitLead`.

## What you build

### A. Admin — Landing Pages builder (the biggest piece)

Routes under `src/app/admin/landing-pages/` (guard: root admin layout already checks role; add a nested layout `requirePermission("content.manage")` mirroring `src/app/admin/content/layout.tsx`).

1. **`/admin/landing-pages` list** — table: title, slug shown as `/l/<slug>` with a copy button, status badge (draft/published per token palette), fb content id, updated, row actions (Edit, Publish/Unpublish, Trash with AlertDialog). "New landing page" primary button. URL-state search/status filters (mirror catalog listings pages).
2. **`/admin/landing-pages/new` + `/admin/landing-pages/[id]/edit`** — THE BUILDER. Structure:
   - Top bar: back link, title input, status toggle (Draft/Publish), Publish button.
   - 3-column canvas (lg): **Left rail** = ordered section list (chips showing type + first text token) with up/down/remove; "Add section" menu grouped by template type. **Center** = live preview of the page (see shared renderer below) — scrollable, device-width toggle (mobile/desktop). **Right panel** = the SELECTED section's config form generated from `CONTENT_FIELDS[type]` (text → input, textarea → textarea, image → URL input + note "attach via Media library URL", number → number, checkbox, repeatable → sub-list with add/remove). Header/title, slug (auto from title + regenerate), and SEO title/description live in a collapsible "Page settings".
   - A **Form** section is special: selecting it (or a "Form & fields" tab) opens the `formConfig` editor: page title/subtitle for the form, and a **fields builder** (rows: field label, key (auto from label), type select (text/tel/email/select/textarea/date), required switch, options editor when select, placeholder; up/down/remove; "Add field"). Show a live phone-or-email guarantee note ("visitors must be reachable — keep at least a phone or email field").
   - Save (draft) + Save & publish. Validation errors surface under fields and a top banner via the relayed `{code,error}`.
3. **Shared landing renderer** — create `src/components/landing/` with a renderer that is the SINGLE source of truth used by BOTH the builder preview AND the public `/l/[slug]` page:
   - `LandingRenderer.tsx` (server-friendly): takes `LandingRenderData.sections` and renders each typed section top-to-bottom via a per-type component map in `src/components/landing/sections/` (`HeroSection`, `Benefits`, `PackageShowcaseGrid` (reuses PackageCard), `Gallery` (existing `src/components/site/Gallery.tsx` island), `Testimonials`, `Faq` (existing FaqAccordion island), `Countdown` (client island), `StickyCta`, `WhatsappCta`, `ThankYou`). Landing pages have NO site header/footer — they are full-bleed standalone.
   - The builder preview renders the SAME tree (document that divergence is forbidden). Wrap the preview in a scaling container (CSS transform scale) so the whole page previews.
4. **Public route `/l/[slug]`** → `src/app/l/[slug]/page.tsx` (server): `getPublishedLandingBySlug`, `generateMetadata` (seo.title/description, else slug), `notFound()` when null, render `<LandingRenderer>` + append the LeadForm island wherever a `form` section appears (or as a fixed bottom CTA when stickyCta/form present). Tag/caching is already handled by the cached service — just call it in an async server component.
5. **LeadForm island** — `src/components/landing/LeadForm.tsx` (client): given `formConfig` + `landingSlug`, renders fields (label+input per type; select options; textarea; h-11, tokens), client-side validation mirroring `buildLeadSchema` semantics (required + email/tel + phone-or-email), honeypot hidden field, one primary submit (44px), busy state, inline field errors + live region. On submit calls `submitLead({landingSlug, formData, fbParams})` (server action import) and on `{ok}` shows an inline success card (or navigates per thankYou). `fakeOk` and failures surface appropriately. Capture `_fbp`/`_fbc` from `document.cookie` (read util in `src/lib/fb-cookies.ts`, client-safe) and pass in `fbParams`. If a pixel id is configured (see C below), also `fbq("track","Lead",{eventID})` with the SAME `eventId` you generated and passed to the server — dedup contract.

### B. Admin — Leads workspace

Root `src/app/admin/leads/` (guard leads.view for pages; lead actions carry their own leads.manage). The admin menu already links Leads.

1. **`/admin/leads` board** — a refined kanban: 6 status columns + counts (from `getLeadBoardCounts`), scrollable row on desktop / stacked on mobile. Cards: name (bold), phone with tel/WhatsApp quick icons, email if present, source + landing title, "x min/h ago", assigned-to chip ("Unassigned" muted). Moving a card = `changeLeadStatusAction` (client island, optimistic + `router.refresh`); also a per-card overflow menu (View detail, move-to submenu, Assign, Mark converted when appropriate). Top bar: filter select (All / Unassigned / Assigned to me), search box, "List view" toggle.
2. **List view** (same route, ?view=list) — table with status filter + pagination.
3. **`/admin/leads/[id]` detail** — two-column: left = lead profile card (contact with tel/wa/mailto, source+landing link, submitted time, all `formData` rows rendered as label/value list, `message` full), then a form-data accordion; right sticky = status select, assign select (staff from `listStaffUsers`, shows current), Convert button (AlertDialog → `convertLeadAction` → board clears it), note composer (textarea + add). Below: **timeline** of `lead.events` (icon per type: created/assigned/status/note/converted, actor name, timestamp, note text). All transitions optimistic + `router.refresh`.

### C. Admin — Meta tracking page

Add a nav entry: edit `src/lib/admin-menu.ts` to include `{href:"/admin/tracking", label:"Tracking", icon:"activity", permission:"tracking.view"}` and build `src/app/admin/tracking/page.tsx` (guard tracking.view) + `src/app/admin/tracking/TrackingClient.tsx`:
- Status cards (Pixel ✓/needs, CAPI token ✓/needs, Test code optional) from `getMetaConfigStatus`; envWritable banner.
- Three fields (Pixel ID text; access token password + show-toggle; test code text). Save → `saveMetaConfig`: when envWritable show success chips; when NOT writable render the returned `copyBlock` (monospace block) + instructions + a "I've added them — Re-check" button that refetches `getMetaConfigStatus` (Vercel/Portainer flow). Token field NEVER prefilled/re-echoed (backend returns no token).
- Event log table: `listTrackingEvents` rows (event, source, capiStatus badge, time, view response JSON) + counts chips + capiStatus filter + pagination.
- A short explainer that events fire server-side on Lead submit / (future) contact — no manual firing UI.

### D. Public pixel bootstrap (small)

The Lead event reaches Meta via server CAPI (source of truth). Pixel-side `fbq` is only meaningful once a **public** pixel id exists — the backend reads `META_PIXEL_ID` (env). For v1: build `src/components/landing/PixelBootstrap.tsx` (client) that loads fbq lazily ONLY if the server passes a serialized `{pixelId}` from `getMetaConfigStatus()`-equivalent (do NOT read process.env on client). The `/l/[slug]` page should expose the pixel id to that island via a prop when configured. If pixel not configured, no-op (and the tests below still pass — CAPI log is the truth).

## Design guidance (summary — the two skills + UI spec are authority)

- Landing pages are the product's sales face: editorial + conversion, big display type, ONE dominant CTA, high contrast sections on `bg-background`/`bg-secondary` banding, imagery-first. Reuse home-page component vocabulary (SectionHeading kicker, PackageCard) so landing pages feel like the site, not a stranger.
- Admin stays quiet/dense; the kanban and builder are the two most-used admin surfaces — prioritize clean scanning, keyboard reachable (move via menu), clear empty states.
- Status → color mapping is in the token system (success/warning/info + neutral); badge components should take a `status` and map internally.
- Keep client-island budgets sane (UI spec §8). The builder is heavy by nature — fine — but `/l/[slug]` public must stay light: renderer mostly server, only countdown/gallery/faq/form are islands.

## Acceptance (run before reporting done)

1. `npx next typegen && npm run lint && npm run typecheck && npm run build` all green.
2. Unit tests you add (validation mirrors, field-builder helpers) pass.
3. e2e specs you add pass; put them in `tests/e2e/leads-landing.spec.ts` (alphabetical filename sorts it correctly; the suite is serial `workers:1` with `00-setup.spec.ts` first creating the admin). Cover at least:
   - Create + publish a landing page through the builder (unique slug, e.g. `landing-e2e-<uniqueness>`); publish succeeds.
   - Visit `/l/<slug>` → hero headline from your config + form renders; submit the form → success card.
   - Admin Leads board → your new lead appears in the `new` column with the landing's title; open detail → formData rows visible; change status → contacted; add a note → timeline shows it.
   - Tracking page → event log has a `Lead` row for that submission (`capiStatus` = `meta_not_configured` or `ok`, but the row exists); with pixel unconfigured this is the whole loop.
   - Residue-tolerance: DB accumulates between runs — assert PRESENCE by your unique slug/labels, never exact global counts.
4. Full existing suite stays green (do not break the other specs).

## Done

Report: files added/changed, the two skills' guidance you applied (concrete), what you verified, any backend-contract surprise (a name you expected that didn't exist — the controller fixes the backend or your understanding), and the e2e results. You will then receive a review; fix per the change order if issued.
