# Plan 5 Frontend — Order for the implementation agent

You are the frontend implementation agent for TripMate v2 **Plan 5** (Orders + Payments + Expenses + Customer Portal UI). The entire Plan-5 BACKEND — orders (orderNo, status machine, quotes, lead conversion), payments (manual/paylater gateways, verification queue, Purchase CAPI), expenses (approval + P&L reports), media user-documents, portal services, and all transactional emails — is already built, verified (360 tests incl. live-DB integration), and committed on this branch. Your job is ONLY the UI layer.

**Step 1 — read, in order:**
1. `docs/superpowers/plans/2026-09-06-plan5-frontend-handoff.md` — your COMPLETE requirements doc: verified backend contract (exact export names), every surface to build, acceptance criteria. Binding.
2. `docs/superpowers/specs/2026-09-05-ui-design-system.md` — tokens, admin patterns §5, a11y §7, perf §8. Binding.
3. Invoke `frontend-design` and `ui-ux-pro-max` skills before building if available. Design mandate: PUBLIC = clean minimal-luxury editorial with soft depth; ADMIN = minimal, clean, COMPACT, responsive, info-dense — not default-shadcn. 44px targets, live-region errors.
4. Mirror surfaces: `/admin/leads` (board+list+detail+timeline), `/admin/catalog` (CRUD tables + dialogs), `/l` builder, `/packages/[slug]` sidebar, landing LeadForm (dynamic formConfig fields).

**Step 2 — repo:** worktree `E:\Custom Web Projects\TripMate\.claude\worktrees\nervous-pike-900e52`, branch `claude/nervous-pike-900e52` (`git pull`; backend through `8ce5a6f`). Dev DB live (seeded incl. gateways + expense categories); admin `admin@tripmate.test` / `supersecret123`. `npx next typegen` before typecheck after adding routes.

**Step 3 — build (per the handoff doc):** public BookingForm on package detail + InquiryForm on inquiry services; admin Orders board/list/detail (quotes, legal-transition status menu, payments block); Payments verification queue + gateway config; Expenses entries + categories + P&L Reports tab (no new chart deps); portal `/account/orders` + order detail w/ payment submission + `/account/documents` upload.

**Step 4 — acceptance:** all gates green (`npx next typegen && npm run lint && npm run typecheck && npm run build && npm test`), existing e2e unbroken, plus your `tests/e2e/orders-payments.spec.ts` golden path (book → quote → payment → verify → confirmed; expense submit+approve; reports nonzero). Residue-tolerant assertions (unique orderNo). Commit as you go (no push/merge).

**Step 5 — report** files, design choices, any backend-contract surprise, e2e results. Then STOP — the controller reviews and issues a change order if needed. Do not exceed the handoff doc's scope; report genuine backend gaps instead of hacking around them.
