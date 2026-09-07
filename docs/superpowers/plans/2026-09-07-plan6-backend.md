# TripMate v2 — Plan 6 Backend (Dashboard KPIs + Settings + Email template admin)

Non-frontend services/actions first; UI handed to the frontend agent via handoff doc after verification. Worktree branch claude/nervous-pike-900e52 (P5 merged; main=9e0f05d).

## Carry-overs binding (spec §15 + P3-T13 ruling)

1. **searchEngineVisibility 3-part wiring**: settings page must expose the toggle; (a) `(public)` layout/root metadata noindex when false, (b) robots.ts `Disallow: /` when false, (c) sitemap.ts empty when false. All three ship together.
2. **Home generateMetadata**: marketing title/description (site setting + home hero copy), not the generic default.
3. **seo-title cleanup**: normalize existing DB seo titles that still carry the "| TripMate" suffix (one-off script or migration-time cleanup in settings service).
4. **Settings saves call updateTag(CACHE_TAGS.settings)** — every settings mutation expires the settings tag (today the wizard writes but tag expiry is scattered).

## Tasks

T1 dashboard service — src/modules/dashboard/service.ts (server-only, SQL aggregates; NO UI): getDashboardKpis() → { leadsToday, leadsTotal, conversionRate (converted/total), ordersByStatus (board counts), pendingPaymentsCount, unassignedLeadsCount, revenueThisMonth (verified payments), expensesThisMonth (approved), netThisMonth, pendingExpensesCount }, getDashboardTrend({days=30}) → daily {date, leads, orders, revenue} for chart consumption. All GROUP BY/date-bucketed SQL mirroring expenses getPLReport style. Actions: none (RSC reads, admin layout already gates).

T2 settings service+actions — src/modules/settings/site-settings.ts (server-only): getSiteSettings()/updateSiteSettings(input) typed zod (title, phone, email, address, logoUrl, faviconUrl, searchEngineVisibility, footer fields), getHomeSettings()/updateHomeSettings (hero copy), all writes updateTag(CACHE_TAGS.settings). Public settings read helper for (public) layout metadata (cached 'use cache' + settings tag). Actions: saveSiteSettingsAction/saveHomeSettingsAction (settings.manage, relay, zod-at-boundary).

T3 SEO wiring — (a) `(public)` root: when searchEngineVisibility false → metadata robots noindex,nofollow (read via cached settings); (b) robots.ts Disallow: / when false; (c) sitemap.ts returns [] when false. (d) Home page.tsx generateMetadata: title = site title + tagline, description from home hero sub (fallback marketing copy). (e) seo-title cleanup: one-off idempotent script scripts/clean-seo-titles.ts (strip trailing "| TripMate" from listings/posts/pages seo.title where present) — run once, commit, document.

T4 email-template admin preview — src/modules/email/admin.ts: listEmailTemplates() (static registry of the 8 shipped templates: id, name, description, sampleParams), renderEmailTemplatePreview(id, params?) → {subject, html} using the real render fns with safe sample data. Actions: previewEmailTemplateAction (settings.manage? content.manage? — pick settings.manage, it's config surface; document). NO template editing in v1 — preview only (source of truth is code).

T5 gates + handoff — full lint/typecheck/build/unit + integration; e2e unbroken (robots/sitemap tests may assert current state — adjust if visibility default true keeps behavior identical); commit; write plan6-frontend-handoff.md + ORDER (dashboard page UI, settings page UI w/ visibility toggle, email-template preview page UI).

## Frontend handoff (after backend verified)
Admin dashboard page (KPI cards + trend chart + queues), /admin/settings (site/home forms + visibility toggle), /admin/email-templates (list + preview panes). Contract names pinned from verified code.
