# Plan 6 Frontend — Order for the implementation agent

You are the frontend implementation agent for TripMate v2 **Plan 6** (Admin Dashboard + Settings + Email Template Preview UI). The Plan-6 BACKEND — dashboard KPI/trend aggregates, typed site/home settings with cache-tag expiry, the searchEngineVisibility SEO wiring (robots/sitemap/noindex), and the email-template preview registry — is already built, verified (358 unit tests default + full live-DB integration green, build green), and committed on this branch. Your job is ONLY the UI layer.

**Step 1 — read, in order:**
1. `docs/superpowers/plans/2026-09-07-plan6-frontend-handoff.md` — your COMPLETE requirements doc: verified backend contract (exact export names and shapes), the three surfaces to build, acceptance criteria. BINDING.
2. `docs/superpowers/specs/2026-09-05-ui-design-system.md` — tokens §2, admin patterns §5, a11y §7. Binding.
3. Invoke `frontend-design` and `ui-ux-pro-max` skills before building if available. ADMIN design mandate: minimal, clean, COMPACT, responsive, information-dense, quiet — NOT the default shadcn look; 44px targets, live-region errors, token status colors.
4. Mirror existing surfaces: `/admin/leads` (chrome + status tokens), `/admin/expenses/reports` (stat cards + token bars), `/admin/catalog` (forms, dialogs, URL-state filters). The dashboard route is `src/app/admin/page.tsx` (currently a placeholder — replace).

**Step 2 — repo:** worktree `E:\Custom Web Projects\TripMate\.claude\worktrees\nervous-pike-900e52`, branch `claude/nervous-pike-900e52` (`git pull`; backend through `211d644`). Dev DB live; admin `admin@tripmate.test` / `supersecret123`. `npx next typegen` before typecheck after adding routes.

**Step 3 — build (per the handoff doc):**
A. Dashboard page — KPI cards (leads today/total + conversion, pending payments, unassigned leads, revenue/expenses/net this month), ordersByStatus strip, pending queues with links, 30-day trend chart (token-styled SVG/div bars — NO new chart deps) + accessible data table fallback.
B. Settings page — Site tab (title/phone/email/address/logo/favicon/footerDescription + searchEngineVisibility switch with the SEO helper text) and Home tab (hero fields), client forms on the backend zod schemas, ""-clears semantics, relay error surfacing, `router.refresh()`.
C. Email templates page — list the 6 templates, preview dialog with sandboxed iframe (srcDoc, sandbox="" — render inert) + per-template overrides mini-form, preview via `previewEmailTemplateAction`. Add the `/admin/email-templates` nav entry (settings.manage) to `src/lib/admin-menu.ts` + AdminShell icon map.

**Step 4 — acceptance:** gates green (`npx next typegen && npm run lint && npm run typecheck && npm run build && npm test`); existing e2e unbroken (full suite, serial workers:1); new `tests/e2e/dashboard-settings.spec.ts` covering: dashboard renders KPI cards + trend labels; settings loads prefilled title; toggle searchEngineVisibility OFF → save → `/robots.txt` shows `Disallow: /` → toggle back ON → robots normal; email-templates lists 6, preview renders a subject. Residue-tolerant assertions, own login helper. Commit as you go (no push/merge).

**Step 5 — report** files, design choices, any backend-contract surprise, e2e results. Then STOP — the controller reviews and issues a change order if needed. Do not exceed the handoff doc's scope; report genuine backend gaps instead of hacking around them.
