# Plan 4 Frontend — Order for the implementation agent

You are the frontend implementation agent for TripMate v2 **Plan 4** (Leads + Landing Pages + Meta Tracking UI). The entire Plan-4 BACKEND (all services, server actions, Meta CAPI, lead emails — everything non-UI) is already built, verified, and committed on this branch. Your job is ONLY the UI layer that consumes it, built to a modern, premium standard.

**Step 1 — read these first, in order:**
1. `docs/superpowers/plans/2026-09-06-plan4-frontend-handoff.md` — your COMPLETE requirements doc: the backend API you consume (exact export names), every page/component to build, acceptance criteria, gates.
2. `docs/superpowers/specs/2026-09-05-ui-design-system.md` — the design system (tokens, admin patterns §5, a11y §7, perf §8). Binding.
3. Invoke the `frontend-design` and `ui-ux-pro-max` skills BEFORE writing UI and apply them (project mandate). `docs/superpowers/specs/2026-09-05-tripmate-v2-design.md` §8/§9 for intent.
4. The established page/module patterns to mirror: `src/app/admin/catalog/listings/*` (list + form + actions), `src/app/admin/content/*`, the public pages under `src/app/(public)/*`, components under `src/components/site/*`.

**Step 2 — repo/run environment:** worktree `E:\Custom Web Projects\TripMate\.claude\worktrees\nervous-pike-900e52` (branch `claude/nervous-pike-900e52`; `git pull` first — the backend landed here). Dev DB is live (Postgres host) with superadmin `admin@tripmate.test` / `supersecret123`. Gates: `npx next typegen && npm run lint && npm run typecheck && npm run build`. e2e via `npm run test:e2e` (serial suite; add yours as `tests/e2e/leads-landing.spec.ts`).

**Step 3 — build everything in the handoff doc** (landing-page builder + shared `/l` renderer + LeadForm, leads kanban/list/detail, Meta tracking page, pixel bootstrap). Modern, editorial design; tokens only; 44px targets; status colors; no client data fetching — call server actions and `router.refresh()`.

**Step 4 — acceptance:** all gates green; your e2e covers builder→publish→/l submit→lead appears in admin→status change→tracking log row; residue-tolerant assertions; existing suite unbroken.

**Step 5 — report** files changed, skills applied (concrete), verification output, any backend-contract surprise (name you expected that didn't exist), e2e results.

Then STOP — the controller reviews your work and will issue a change order if needed. Do not exceed the handoff doc's scope; if the backend is genuinely missing something you need, say so in the report rather than hacking around it.
