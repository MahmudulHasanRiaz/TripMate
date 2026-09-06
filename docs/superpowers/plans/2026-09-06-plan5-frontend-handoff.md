# TripMate v2 — Plan 5 Frontend Build Order (ORDERS + PAYMENTS + EXPENSES + PORTAL UI)

> For the frontend implementation agent. Read this entire file before writing code. The Plan-5 BACKEND (orders, payments, expenses, media user-docs, portal services, emails, CAPI) is ALREADY BUILT, verified (360 tests incl. live-DB integration, full lint/typecheck/build green) and committed on this branch. You build ONLY the UI layer.

**Repo:** `E:\Custom Web Projects\TripMate\.claude\worktrees\nervous-pike-900e52` (branch `claude/nervous-pike-900e52`, `git pull` first — backend through commit `8ce5a6f`). Windows Git-Bash. Stack: Next 16.3.4 cacheComponents ON, React 19.2, TS strict, Tailwind v4 tokens ONLY (raw-hex lint enforced), shadcn/ui, zod v3. Run `npx next typegen` before typecheck after adding routes.

**Design (user mandate):** PUBLIC = clean minimal-luxury, editorial, soft depth (large radii + layered shadows), ONE primary CTA per viewport. ADMIN = minimal, clean, COMPACT, responsive, info-dense, quiet — not default-shadcn. 44px targets, live-region errors, status tokens. Invoke `frontend-design` + `ui-ux-pro-max` skills if available; else this + `docs/superpowers/specs/2026-09-05-ui-design-system.md` are authority. Mirror existing surfaces: `/admin/leads` (board+list+detail), `/admin/catalog`, `/l` builder, `/packages/[slug]` sidebar.

## Backend contract (verified export names — read the files for signatures)

**Bookings** — `src/modules/bookings/`
- `service.ts` (server-only, RSC reads): `listOrders({status?,search?,page?,perPage?})`, `getOrderDetail(id)` (order + events asc + travelers; type OrderDetail), `getOrderBoardCounts()`, `myOrders(userId,{page?})`, `getMyOrderDetail(userId,id)`, `OrderError`.
- `actions.ts`: PUBLIC `createPackageOrderAction(input)` / `createInquiryOrderAction(input)` → `CreateOrderResult` `{ok:true,orderId,orderNo} | {ok:false,error:'not_found'|'validation'|'RATE_LIMITED'|'UNAUTHORIZED', fieldErrors?}`. ADMIN (orders.manage, single-object args, relay): `setQuoteAction({id,quotedPrice})`, `updateOrderStatusAction({id,status,note?})`, `createOrderFromLeadAction({leadId,input})`.
- `validation.ts`: `ORDER_STATUSES`, `ORDER_STATUS_TRANSITIONS` + `isLegalOrderTransition(from,to)` (use to enable/disable status menu items), `packageOrderInputSchema`, `inquiryOrderInputSchema`, `formatOrderNo`.
- Status set: pending, in_review, quoted, confirmed, cancelled, completed. Package orders are created `in_review`; inquiry orders `pending`.

**Payments** — `src/modules/payments/`
- `service.ts`: `listGateways(activeOnly)`, `listQueue({status?,page?})` (submitted-first verification queue), `listForOrder(orderId)`, `getOrderPaidTotal(orderId)`, `PaymentError`.
- `actions.ts` (single-object args, relay): PORTAL (session + ownership): `submitMyPaymentAction({orderId,gatewayId,methodTxnId,senderNumber?,screenshotUrl?,note?})`, `selectPayLaterAction({orderId})`. ADMIN `payments.verify`: `verifyPaymentAction({id,note?})`, `rejectPaymentAction({id,note})`, `adminCreatePaymentAction(...)`. ADMIN `payments.manage_gateways`: `upsertGatewayAction`, `setGatewayActiveAction`, `reorderGatewaysAction`.
- `validation.ts`: `gatewayInputSchema` (name, kind manual|paylater|sslcommerz|bkash|nagad, config record-of-strings DISPLAY-ONLY — never secrets, instructions, isActive, sortOrder, logoUrl), `paymentSubmitInputSchema`, `MANUALLY_PAYABLE_GATEWAY_KINDS`.
- Gateway kinds manual/bkash/nagad accept manual txn submission; paylater = "team will contact"; sslcommerz = NOT_IMPLEMENTED (show disabled).

**Expenses** — `src/modules/expenses/`
- `service.ts`: `listCategories(activeOnly)`, `listExpenses({status?,categoryId?,from?,to?,search?,page?})`, `getExpenseDetail(id)`, **`getPLReport({from,to})`** → `{revenue, expenseTotal, net, expenseByCategory[], revenueByMonth[], expenseByMonth[]}`, **`getServiceMargin({from,to})`** → per-category `{categoryName,revenue,directCost,margin}`, `ExpenseError`.
- `actions.ts`: `submitExpenseAction`, `approveExpenseAction`, `rejectExpenseAction` (expenses.submit / expenses.approve), category config: `upsertExpenseCategoryAction`, `setExpenseCategoryActiveAction`, `softDeleteExpenseCategoryAction` (expenses.approve).

**Portal** — `src/modules/portal/service.ts` (ONE import surface): `myOrders(userId,{page?})`, `getMyOrderDetail(userId,id)` → `MyOrderDetail` (order + events + travelers + `payments[]` + `paidTotal`), `myDocuments(userId,{page?})`. Media: `uploadMyDocumentAction` (session, 20/min, jpeg/png/webp/pdf ≤10MB) in `src/modules/media/actions.ts`; `listUserDocuments` service-only.

Admin menu: Orders/Payments/Expenses entries already exist (Plan 2). Permissions: `orders.view/manage`, `payments.verify/manage_gateways`, `expenses.submit/approve` — gate layouts accordingly (nested requirePermission like `/admin/catalog`).

## What you build

### A. Public — booking + inquiry forms
1. `src/components/site/BookingForm.tsx` (client island) + mount in the existing package-detail sticky sidebar (`src/app/(public)/packages/[slug]/_components/PackageSidebar.tsx` — replace the phone/mailto-only CTA block with primary "Book Now" opening the form; keep phone/WhatsApp as secondary). Fields from `packageOrderInputSchema`: customer name/phone/email, travelers repeatable (name, passportNo?, dob?, relation?; min 1), specialRequests. Inline validation mirrors the schema; submit → `createPackageOrderAction` (signed-in users get orders linked automatically); success card shows **orderNo**; fieldErrors render under fields.
2. Services pages (`/services/[slug]`, inquiry_based listings): an InquiryForm section — dynamic fields from the listing's `formConfig` (same render approach as landing LeadForm) when present, else name/phone/email/details; submit → `createInquiryOrderAction`. Scope-guard comment: redirect-kind services unchanged.

### B. Admin — Orders workspace (`/admin/orders`, gate orders.view)
1. Board+list (mirror `/admin/leads`): 6 status columns w/ counts (`getOrderBoardCounts`), cards = orderNo + customer name/phone + listing title + type badge (package/inquiry) + quoted/final price + created ago; move-to menu validated by `isLegalOrderTransition`; search by orderNo/name/phone.
2. Detail (`/admin/orders/[id]`): customer card (snapshot + travelers table), listing snapshot card, quote composer (`setQuoteAction` when status pending/in_review), status select (legal transitions only), timeline (orderStatusEvents), payments list for the order (`listForOrder` + paidTotal) with inline "Verify"/"Reject" (`payments.verify` holders), convert-lead provenance shown when leadId set.

### C. Admin — Payments (`/admin/payments`, gate payments.verify)
1. Verification queue: submitted payments table (orderNo, customer, gateway, amount, txnId, sender, screenshot link, submitted time) → Verify (note optional) / Reject (note) actions,AlertDialog confirm on reject; filter by status; pagination.
2. Gateway config tab (gate payments.manage_gateways): card list w/ activate toggle + reorder (up/down), edit dialog (name, kind select, instructions textarea, config key-value editor, logoUrl) — config is DISPLAY data (account numbers etc.), never secrets.

### D. Admin — Expenses (`/admin/expenses`, gate expenses.submit)
1. Entries table: filters (status/category/date-range/search), submit dialog (category, amount, date — not future, description, vendor, receiptUrl, optional orderId link), approve/reject (expenses.approve) with note.
2. Categories tab: CRUD (name, kind operational|cost_of_sales|other, description, active) w/ IN_USE guard surfaced.
3. **Reports tab**: period picker (from/to) → P&L summary cards (revenue / expenseTotal / net), expenseByCategory bars, revenueByMonth + expenseByMonth trend (simple token-styled SVG or div bars — no new chart deps; recharts is NOT installed), service margin table (categoryName, revenue, directCost, margin). All numbers server-aggregated.

### E. Customer portal (`/account` group — layout exists, gate session)
1. `/account/orders` — my orders list (orderNo, listing title, status badge, price, created) + pagination.
2. `/account/orders/[id]` — order detail: status timeline, travelers, quoted price + **payment block**: gateway select (active manual gateways' instructions rendered from `config`+`instructions`), txnId + senderNumber (+ screenshot URL field v1), submit → `submitMyPaymentAction`; paylater button → `selectPayLaterAction`; payments history w/ status badges + paidTotal. NOTE: only orders with `userId === session.user.id` (guest orders pay via admin entry — show a hint).
3. `/account/documents` — my documents grid + upload (dropzone → `uploadMyDocumentAction`, 10MB, jpeg/png/webp/pdf).

## Acceptance
1. Gates: `npx next typegen && npm run lint && npm run typecheck && npm run build && npm test` green; existing e2e unbroken.
2. New e2e `tests/e2e/orders-payments.spec.ts` (runs in the serial suite after 00-setup): book the seeded Hajj package via the public form → orderNo shown; admin orders board shows it in in_review; set a quote; portal-ish flow: verify adminCreatePaymentAction is NOT needed — instead admin creates payment via queue? Simplest golden path: admin orders detail → "record payment" (adminCreatePaymentAction) or submit via gateway from the ORDER detail payments block as admin, then verify in /admin/payments queue → order flips to confirmed; expense: submit + approve one; reports tab shows nonzero revenue. Assert by unique orderNo, never global counts.
3. Report: files, design choices, contract surprises, e2e results. Then STOP for controller review.
