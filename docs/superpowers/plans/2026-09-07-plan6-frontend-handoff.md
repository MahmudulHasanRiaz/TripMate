# TripMate v2 — Plan 6 Frontend Build Order (DASHBOARD + SETTINGS + EMAIL TEMPLATES UI)

> For the frontend implementation agent. The Plan-6 BACKEND (dashboard KPI/trend aggregates, typed site/home settings with cache-tag expiry, searchEngineVisibility SEO wiring, email-template preview registry) is BUILT, verified (358 unit default / full integration green, build green) and committed on this branch. You build ONLY the UI layer.

**Repo:** `E:\Custom Web Projects\TripMate\.claude\worktrees\nervous-pike-900e52` (branch `claude/nervous-pike-900e52`, `git pull`; backend through `211d644`). Windows Git-Bash. Next 16.3.4 cacheComponents ON, TS strict, Tailwind v4 tokens ONLY, shadcn/ui, zod v3. `npx next typegen` after adding routes.

**Design:** ADMIN = minimal, clean, COMPACT, responsive, info-dense — NOT default-shadcn. 44px targets, live-region errors, token status colors. Invoke `frontend-design` + `ui-ux-pro-max` if available; else this + `docs/superpowers/specs/2026-09-05-ui-design-system.md` §5/§7 are authority. Mirror: `/admin/leads` (board chrome), `/admin/expenses/reports` (stat cards + bars), `/admin/catalog` (forms + dialogs).

## Backend contract (verified — read files for exact types)

- **Dashboard** — `src/modules/dashboard/service.ts` (server-only, RSC reads; admin layout gates): `getDashboardKpis()` → `DashboardKpis` { leadsToday, leadsTotal, leadConversionRate, ordersByStatus (board-counts shape), pendingPaymentsCount, unassignedLeadsCount, revenueThisMonth, expensesThisMonth, netThisMonth, pendingExpensesCount }; `getDashboardTrend({days?})` → `DashboardTrendPoint[]` {date 'YYYY-MM-DD', leads, orders, revenue} — continuous zero-filled series, chart-ready.
- **Settings** — `src/modules/settings/site-settings.ts` (server-only reads) + `site-settings-actions.ts`: `getSiteSettings()` / `getHomeSettings()` (merged-over-defaults, never null); actions `saveSiteSettingsAction(input)` / `saveHomeSettingsAction(input)` (settings.manage, relay `{ok}|{ok:false,code,error}`); zod schemas in `site-settings-validation.ts` (import for client-side mirror: `siteSettingsInputSchema`, `homeSettingsInputSchema`; optional fields: undefined=preserve, ""=clear). Site fields: title, phone, email, address, logoUrl, faviconUrl, searchEngineVisibility, footerDescription?. Home fields: heroHeadline, heroSub, heroImage, heroImageAlt, heroButtonLabel, heroButtonLink.
- **Email templates** — `src/modules/email/admin.ts`: `listEmailTemplates()` → serializable registry [{id, name, description, audience}]; `src/modules/email/admin-actions.ts`: `previewEmailTemplateAction({id, overrides?})` (settings.manage, relay) → `{ok, subject, html}` — unknown override keys REJECTED with the valid param list in the error. Preview only — no editing (source of truth is code).

Admin menu: `/admin/settings` entry already exists (settings.manage). ADD an `/admin/email-templates` entry (settings.manage) to `src/lib/admin-menu.ts` + `AdminShell.tsx` icon map (suggest `mail-open` or `eye`).

## What you build

### A. Dashboard page (`/admin/page.tsx` — REPLACE the placeholder)
- KPI cards row (token-styled, compact): leads today / total + conversion rate; pending payments count; unassigned leads count; revenue this month; expenses this month; net (green/red by sign).
- `ordersByStatus` summary strip (6 status chips with counts — reuse the orders board status token mapping).
- Queues section: two compact lists — pending payment submissions (link → /admin/payments) and pending expense approvals (link → /admin/expenses), each showing count + "Open queue" link.
- Trend chart: 30-day leads/orders/revenue from `getDashboardTrend` — token-styled SVG or div bars (NO new chart deps, recharts NOT installed; mirror the expenses Reports tab's bar approach). Legend + accessible table fallback (sr-only or visible small table for a11y).
- All server-rendered (RSC, no client fetch); loading.tsx skeleton for the group if not present.

### B. Settings page (`/admin/settings/page.tsx` — currently placeholder? verify: the route may not exist yet; create)
- Tabs or sections: **Site** (title, phone, email, address, logoUrl, faviconUrl, footerDescription, searchEngineVisibility switch with helper text "When off, the site tells search engines not to index and the sitemap empties") and **Home** (heroHeadline, heroSub, heroImage + heroImageAlt, heroButtonLabel, heroButtonLink).
- Client form per section: react-hook-form + zodResolver using the backend schemas; ""-clears vs preserve semantics noted in helper text; save → action → relay error surfacing (inline + live region) / success toast + `router.refresh()`.
- Image URL fields: text inputs v1 (MediaPicker swap is a later plan — note in comment).

### C. Email templates page (`/admin/email-templates`)
- List of the 6 templates (name, description, audience chip customer/staff) → click opens a preview pane/dialog: subject line + rendered HTML in a sandboxed iframe (srcDoc, sandbox="" — NO script execution; the HTML is our own template output but render it inert anyway) with an overrides mini-form (param key inputs per template — the action's error lists valid keys; render them from a static param list you derive from the registry descriptions or hardcode per id: lead-received {name, landingTitle, sitePhone}, lead-assigned {leadName, landingTitle, adminUrl, assignedToName}, order-confirm {orderNo, customerName, listingTitle, portalUrl}, quote-ready {orderNo, customerName, listingTitle, quotedPrice, currency, portalUrl}, payment-verified {orderNo, customerName, amount, currency}, payment-rejected {orderNo, customerName, note}).
- Preview calls `previewEmailTemplateAction` (client island); errors (unknown param / rate) surface inline. Header note: "Templates are code-owned — preview only."

## Acceptance
1. Gates green: `npx next typegen && npm run lint && npm run typecheck && npm run build && npm test`; existing e2e unbroken (full `npm run test:e2e`).
2. New e2e `tests/e2e/dashboard-settings.spec.ts`: login → dashboard shows KPI cards + trend section (assert a couple of stable labels, not exact numbers — DB accumulates); → /admin/settings loads with current site title prefilled, toggle searchEngineVisibility off → save → visit `/robots.txt` asserts `Disallow: /` present → toggle back on → save → robots back to normal; → /admin/email-templates lists 6 templates, open one, preview renders subject (overrides optional). Residue-tolerant, own login helper, serial suite order.
3. Commit as you go; report files, design choices, contract surprises, e2e results. STOP for controller review.
