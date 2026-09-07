import { afterEach, describe, expect, it, vi } from "vitest";
import "dotenv/config";
// Pure type-only import (validation.ts is zod-only) for the gateway-kind union.
import type { GatewayKind } from "@/modules/payments/validation";

// service.ts imports "server-only" (it throws outside a React Server runtime);
// stub the marker so the suite can actually run under vitest's node env when
// RUN_DB_INTEGRATION=1 — same pattern as tests/bookings-service.integration.test.ts.
vi.mock("server-only", () => ({}));

// DB-backed integration suite for the payments service. The drizzle client
// connects against process.env.DATABASE_URL at module load, so local
// `vitest run` (no database) keeps this suite OFF — same contract as the other
// module integration suites.
//
// The guarded actions (withGuard + updateTag) are NOT callable under vitest's
// node env (getSession/updateTag need Next request state), so the tests
// exercise the service layer they are built from — submit → verify → order
// confirmed, reject + re-submit, the guard rails, pay-later and the gateway
// CRUD — the exact paths the actions wrap. verifyPayment also fires the CAPI
// "Purchase" fire-and-log (tracking rows land in the DB; Meta itself is
// unconfigured in tests, which sendCapiEvent resolves without throwing), so
// the purge cleans this run's Purchase tracking rows too.
const integration = process.env.RUN_DB_INTEGRATION === "1";

/** Purge cutoff for this run's CAPI Purchase tracking rows. */
const runStart = new Date();

describe.skipIf(!integration)("payments service (integration — Postgres)", () => {
  // Unique-per-run marker so parallel/leftover rows can never be picked up by
  // another run or a failed previous run.
  const marker = `it-pay-${Date.now().toString(36)}${Math.floor(
    Math.random() * 1e9,
  ).toString(36)}`;
  const emails = {
    owner: `owner-${marker}@test.local`,
  };
  const slugs = {
    published: `it-pay-published-${marker}`,
    category: `it-pay-cat-${marker}`,
  };

  /** Rows created by this run, for precise FK-safe cleanup. */
  const orderIds: string[] = [];
  const gatewayIds: string[] = [];

  const purge = async () => {
    const { db } = await import("@/db/client");
    const { orders, orderStatusEvents, travelers } = await import("@/modules/bookings/schema");
    const { payments, paymentGateways } = await import("@/modules/payments/schema");
    const { listings, serviceCategories } = await import("@/modules/catalog/schema");
    const { users } = await import("@/modules/users/schema");
    const { trackingEvents } = await import("@/modules/tracking/schema");
    const { eq, inArray, sql } = await import("drizzle-orm");

    // Orders this run created but whose id escaped tracking (a later step
    // threw) — matched via the run-unique customer email in the snapshot.
    const strayOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(sql`(${orders.customerSnapshot} ->> 'email') = ${emails.owner}`);
    const ids = [...new Set([...orderIds, ...strayOrders.map((r) => r.id)])];
    if (ids.length > 0) {
      await db.delete(payments).where(inArray(payments.orderId, ids));
      await db.delete(orderStatusEvents).where(inArray(orderStatusEvents.orderId, ids));
      await db.delete(travelers).where(inArray(travelers.orderId, ids));
      await db.delete(orders).where(inArray(orders.id, ids));
    }
    if (gatewayIds.length > 0) {
      await db.delete(paymentGateways).where(inArray(paymentGateways.id, gatewayIds));
    }
    await db.delete(listings).where(eq(listings.slug, slugs.published));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, slugs.category));
    await db.delete(users).where(eq(users.email, emails.owner));
    // This run's CAPI Purchase fire-and-log rows (order-linked only via
    // custom_data, so scoped by name + the run's start time).
    await db
      .delete(trackingEvents)
      .where(
        sql`${trackingEvents.eventName} = 'Purchase' and ${trackingEvents.createdAt} >= ${runStart.toISOString()}`,
      );
  };
  afterEach(async () => {
    // Best-effort: a failed cleanup must not fail a passing test nor strand a
    // row for the next test. Pre-run purge keeps the suites independent.
    await purge().catch(() => {});
  });

  /** A published listing under one category (price 1200 BDT). */
  const createListings = async () => {
    const { db } = await import("@/db/client");
    const { listings, serviceCategories } = await import("@/modules/catalog/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(listings).where(eq(listings.slug, slugs.published));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, slugs.category));

    const [category] = await db
      .insert(serviceCategories)
      .values({ name: `Payments ${marker}`, slug: slugs.category, kind: "package" })
      .returning({ id: serviceCategories.id });
    const [published] = await db
      .insert(listings)
      .values({
        categoryId: category.id,
        title: `Payable Package ${marker}`,
        slug: slugs.published,
        price: "1200.00",
        currency: "BDT",
        durationDays: 5,
        status: "published",
      })
      .returning({ id: listings.id });
    return { publishedId: published.id };
  };

  const createUser = async () => {
    const { db } = await import("@/db/client");
    const { users } = await import("@/modules/users/schema");
    const [row] = await db
      .insert(users)
      .values({ email: emails.owner, role: "customer", name: `Owner ${marker}`, status: "active" })
      .returning({ id: users.id });
    return row.id;
  };

  /** A tracked gateway row (defaults: active manual with display config). */
  const createGateway = async (
    overrides: {
      name?: string;
      kind?: GatewayKind;
      isActive?: boolean;
      sortOrder?: number;
    } = {},
  ) => {
    const { db } = await import("@/db/client");
    const { paymentGateways } = await import("@/modules/payments/schema");
    const [row] = await db
      .insert(paymentGateways)
      .values({
        name: `Test Bank ${marker}`,
        kind: "manual",
        config: { accountType: "personal", number: "+8801000000000" },
        instructions: "Send the amount, then submit the transaction ID.",
        ...overrides,
      })
      .returning({ id: paymentGateways.id });
    gatewayIds.push(row.id);
    return row.id;
  };

  const packageInput = (listingId: string) => ({
    listingId,
    customer: { name: `Customer ${marker}`, email: emails.owner, phone: "+8801712345678" },
    travelers: [{ name: `Customer ${marker}` }],
  });

  const track = <T extends { id: string }>(ref: T): T => {
    orderIds.push(ref.id);
    return ref;
  };

  it("submit → verify confirms a quoted order; an unquoted one verifies without a status jump", async () => {
    const payments = await import("@/modules/payments/service");
    const bookings = await import("@/modules/bookings/service");
    const { publishedId: listingId } = await createListings();
    const ownerId = await createUser();
    const gatewayId = await createGateway();

    // Package order starts in_review — its payable amount is the frozen
    // listing price until a quote lands.
    const order = track(
      await bookings.createPackageOrder(packageInput(listingId), { userId: ownerId }),
    );
    const first = await payments.submitManualPayment({
      orderId: order.id,
      gatewayId,
      methodTxnId: `TXN-${marker}-1`,
      senderNumber: "+8801712345678",
      note: "Advance from personal bKash",
    });
    expect(first).toMatchObject({
      status: "submitted",
      amount: 1200,
      currency: "BDT",
      gatewayName: `Test Bank ${marker}`,
      gatewayKind: "manual",
      orderNo: order.orderNo,
      customerName: `Customer ${marker}`,
      methodTxnId: `TXN-${marker}-1`,
      verifiedBy: null,
    });

    // One transfer cannot pay twice: the same (gateway, txn id) is refused
    // while the first claim is live.
    await expect(
      payments.submitManualPayment({
        orderId: order.id,
        gatewayId,
        methodTxnId: `TXN-${marker}-1`,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    // The verification queue lists it (joined fields intact).
    const queue = await payments.listQueue();
    expect(queue.total).toBeGreaterThanOrEqual(1);
    expect(queue.items.some((p) => p.id === first.id)).toBe(true);

    // Verifying while the order is still in_review: the payment verifies, the
    // order does NOT jump to confirmed (the T1 status machine has no
    // in_review → confirmed edge — documented service behavior).
    const verifiedFirst = await payments.verifyPayment(first.id, { verifiedBy: ownerId });
    expect(verifiedFirst.status).toBe("verified");
    expect(verifiedFirst.verifiedBy).toBe(ownerId);
    expect((await bookings.getOrderDetail(order.id))?.status).toBe("in_review");
    expect(await payments.getOrderPaidTotal(order.id)).toBe(1200);

    // Re-verifying is refused.
    await expect(payments.verifyPayment(first.id)).rejects.toMatchObject({
      code: "INVALID_STATE",
    });

    // Quote → the payable amount becomes the quote; verifying confirms.
    await bookings.setQuote(order.id, 1500);
    const second = await payments.submitManualPayment({
      orderId: order.id,
      gatewayId,
      methodTxnId: `TXN-${marker}-2`,
    });
    expect(second.amount).toBe(1500);
    await payments.verifyPayment(second.id, { verifiedBy: ownerId });

    const detail = await bookings.getOrderDetail(order.id);
    expect(detail?.status).toBe("confirmed");
    const confirmEvent = detail?.events.find((e) => e.toStatus === "confirmed");
    expect(confirmEvent).toMatchObject({
      fromStatus: "quoted",
      actorId: ownerId,
      note: "Payment verified (1500.00 BDT)",
    });
    expect(await payments.getOrderPaidTotal(order.id)).toBe(2700);

    // Balance settlement on an already-confirmed order: submission allowed,
    // verification skips the (already-done) transition.
    const third = await payments.submitManualPayment({
      orderId: order.id,
      gatewayId,
      methodTxnId: `TXN-${marker}-3`,
    });
    const verifiedThird = await payments.verifyPayment(third.id, { verifiedBy: ownerId });
    expect(verifiedThird.status).toBe("verified");
    expect((await bookings.getOrderDetail(order.id))?.status).toBe("confirmed");
    expect(await payments.getOrderPaidTotal(order.id)).toBe(4200);

    // The order's payment timeline is chronological.
    const forOrder = await payments.listForOrder(order.id);
    expect(forOrder.map((p) => p.id)).toEqual([first.id, second.id, third.id]);
  });

  it("reject returns the txn id to the customer and never counts as paid", async () => {
    const payments = await import("@/modules/payments/service");
    const bookings = await import("@/modules/bookings/service");
    const { publishedId: listingId } = await createListings();
    const gatewayId = await createGateway();
    const order = track(await bookings.createPackageOrder(packageInput(listingId), {}));

    const payment = await payments.submitManualPayment({
      orderId: order.id,
      gatewayId,
      methodTxnId: `TXN-${marker}-R1`,
      note: "Original attempt",
    });
    const rejected = await payments.rejectPayment(payment.id, {
      rejectedBy: null,
      note: "Screenshot unreadable — please resubmit",
    });
    expect(rejected).toMatchObject({ status: "rejected", note: "Screenshot unreadable — please resubmit" });

    // Off the queue, out of the paid total.
    expect((await payments.listQueue()).items.some((p) => p.id === payment.id)).toBe(false);
    expect(await payments.getOrderPaidTotal(order.id)).toBe(0);

    // Double-reject is refused.
    await expect(
      payments.rejectPayment(payment.id, { note: "again" }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    // A rejected claim does NOT block the corrected re-submission of the same
    // txn id (the customer keeps their transfer, fixes the information).
    const resubmitted = await payments.submitManualPayment({
      orderId: order.id,
      gatewayId,
      methodTxnId: `TXN-${marker}-R1`,
      note: "Clearer screenshot",
    });
    expect(resubmitted.status).toBe("submitted");

    // A verified payment can no longer be rejected either.
    await payments.verifyPayment(resubmitted.id);
    await expect(
      payments.rejectPayment(resubmitted.id, { note: "too late" }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("guards every recording path (order/gateway state, kind, payable amount)", async () => {
    const payments = await import("@/modules/payments/service");
    const bookings = await import("@/modules/bookings/service");
    const { publishedId: listingId } = await createListings();
    const gatewayId = await createGateway();
    const order = track(await bookings.createPackageOrder(packageInput(listingId), {}));

    const MISSING = "00000000-0000-4000-8000-000000000000";
    await expect(
      payments.submitManualPayment({ orderId: MISSING, gatewayId, methodTxnId: `TXN-${marker}-G0` }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      payments.submitManualPayment({ orderId: order.id, gatewayId: MISSING, methodTxnId: `TXN-${marker}-G0` }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // Cancelled orders take no new payments, and an outstanding submitted
    // payment on one cannot be verified.
    const cancelled = track(await bookings.createPackageOrder(packageInput(listingId), {}));
    const beforeCancel = await payments.submitManualPayment({
      orderId: cancelled.id,
      gatewayId,
      methodTxnId: `TXN-${marker}-C0`,
    });
    await bookings.cancelOrder(cancelled.id);
    await expect(
      payments.submitManualPayment({ orderId: cancelled.id, gatewayId, methodTxnId: `TXN-${marker}-C1` }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(payments.verifyPayment(beforeCancel.id)).rejects.toMatchObject({
      code: "INVALID_STATE",
    });

    // Inactive gateways are not payable.
    const inactiveId = await createGateway({ name: `Inactive ${marker}`, isActive: false });
    await expect(
      payments.submitManualPayment({ orderId: order.id, gatewayId: inactiveId, methodTxnId: `TXN-${marker}-G1` }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    // Pay-later is selected via selectPayLater, never a manual txn submit;
    // sslcommerz is a hosted checkout with no manual path at all.
    const paylaterId = await createGateway({ name: `Pay Later ${marker}`, kind: "paylater" });
    await expect(
      payments.submitManualPayment({ orderId: order.id, gatewayId: paylaterId, methodTxnId: `TXN-${marker}-G2` }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    const sslcommerzId = await createGateway({ name: `SSL ${marker}`, kind: "sslcommerz" });
    await expect(
      payments.submitManualPayment({ orderId: order.id, gatewayId: sslcommerzId, methodTxnId: `TXN-${marker}-G3` }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    // An unquoted general inquiry has no payable amount yet.
    const inquiry = track(
      await bookings.createInquiryOrder({ name: `Inquirer ${marker}`, phone: "01712345678" }),
    );
    await expect(
      payments.submitManualPayment({ orderId: inquiry.id, gatewayId, methodTxnId: `TXN-${marker}-G4` }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(payments.selectPayLater({ orderId: inquiry.id })).rejects.toMatchObject({
      code: "INVALID_STATE",
    });

    // Unknown payment ids on the write paths.
    await expect(payments.verifyPayment(MISSING)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(payments.rejectPayment(MISSING, { note: "x" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("selectPayLater records an idempotent pending marker (never an order event)", async () => {
    const payments = await import("@/modules/payments/service");
    const bookings = await import("@/modules/bookings/service");
    const { publishedId: listingId } = await createListings();
    const paylaterId = await createGateway({ name: `Pay Later ${marker}`, kind: "paylater", sortOrder: 10 });
    const order = track(await bookings.createPackageOrder(packageInput(listingId), {}));

    const paylaterGatewayIds = (await payments.listGateways(true))
      .filter((g) => g.kind === "paylater")
      .map((g) => g.id);

    const selection = await payments.selectPayLater({ orderId: order.id, actorUserId: null });
    expect(selection).toMatchObject({
      status: "pending",
      amount: 1200,
      currency: "BDT",
      gatewayKind: "paylater",
      note: "Customer selected pay later",
      methodTxnId: null,
    });
    // selectPayLater auto-selects the active pay-later gateway (lowest sort
    // order); in a shared integration DB more than one may exist, so assert the
    // marker landed on one of them rather than a hard-coded row id.
    expect(paylaterGatewayIds).toContain(selection.gatewayId);

    // Idempotent per order: the same pending row comes back, no stack.
    const again = await payments.selectPayLater({ orderId: order.id });
    expect(again.id).toBe(selection.id);

    // A pending marker is not a submitted payment — it neither verifies nor
    // counts as paid, and the order timeline is untouched (documented choice:
    // the event log stays status-scoped).
    await expect(payments.verifyPayment(selection.id)).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
    expect(await payments.getOrderPaidTotal(order.id)).toBe(0);
    expect((await bookings.getOrderDetail(order.id))?.events).toHaveLength(1);

    // No active pay-later gateway → NOT_FOUND (deactivated, then restored).
    await payments.setGatewayActive(paylaterId, false);
    await expect(payments.selectPayLater({ orderId: order.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await payments.setGatewayActive(paylaterId, true);

    // A quoted order's marker records the quote.
    const quoted = track(await bookings.createPackageOrder(packageInput(listingId), {}));
    await bookings.setQuote(quoted.id, 500);
    const quotedSelection = await payments.selectPayLater({ orderId: quoted.id });
    expect(quotedSelection.amount).toBe(500);

    // Cancelled orders take no pay-later selection.
    const cancelled = track(await bookings.createPackageOrder(packageInput(listingId), {}));
    await bookings.cancelOrder(cancelled.id);
    await expect(payments.selectPayLater({ orderId: cancelled.id })).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });

  it("gateway CRUD: upsert (no name uniqueness), toggle, activeOnly list, transactional reorder", async () => {
    const payments = await import("@/modules/payments/service");
    const MISSING = "00000000-0000-4000-8000-000000000000";

    const created = await payments.upsertGateway({
      name: `CRUD Bank ${marker}`,
      kind: "manual",
      config: { bankName: "Example Bank", accountNo: "0000000000" },
      isActive: true,
      sortOrder: 5,
    });
    gatewayIds.push(created.id);
    expect(created.config).toEqual({ bankName: "Example Bank", accountNo: "0000000000" });
    expect(created.instructions).toBeNull();

    // Update by id (name/kind/config/instructions/active/sortOrder all editable).
    const updated = await payments.upsertGateway({
      id: created.id,
      name: `CRUD Bank 2 ${marker}`,
      kind: "nagad",
      config: { number: "+8801000000001" },
      instructions: "Send to the Nagad number.",
      isActive: false,
      sortOrder: 9,
    });
    expect(updated).toMatchObject({
      id: created.id,
      name: `CRUD Bank 2 ${marker}`,
      kind: "nagad",
      isActive: false,
      sortOrder: 9,
    });

    // Names deliberately carry no uniqueness (display labels; id is identity).
    const sameName = await payments.upsertGateway({
      name: `CRUD Bank 2 ${marker}`,
      kind: "manual",
      config: {},
      isActive: true,
      sortOrder: 6,
    });
    gatewayIds.push(sameName.id);

    // Unknown ids refuse.
    await expect(
      payments.upsertGateway({
        id: MISSING,
        name: "ghost",
        kind: "manual",
        config: {},
        isActive: true,
        sortOrder: 0,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(payments.setGatewayActive(MISSING, true)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // activeOnly hides the deactivated row.
    const all = await payments.listGateways();
    const active = await payments.listGateways(true);
    expect(all.some((g) => g.id === created.id)).toBe(true);
    expect(active.some((g) => g.id === created.id)).toBe(false);
    expect(active.some((g) => g.id === sameName.id)).toBe(true);

    // Reorder applies in bulk; an unknown id fails the WHOLE batch.
    const a = await payments.upsertGateway({
      name: `Reorder A ${marker}`,
      kind: "manual",
      config: {},
      isActive: true,
      sortOrder: 1,
    });
    const b = await payments.upsertGateway({
      name: `Reorder B ${marker}`,
      kind: "manual",
      config: {},
      isActive: true,
      sortOrder: 2,
    });
    gatewayIds.push(a.id, b.id);
    await payments.reorderGateways([
      { id: a.id, sortOrder: 40 },
      { id: b.id, sortOrder: 41 },
    ]);
    const rows = await payments.listGateways();
    expect(rows.find((g) => g.id === a.id)?.sortOrder).toBe(40);
    expect(rows.find((g) => g.id === b.id)?.sortOrder).toBe(41);

    await expect(
      payments.reorderGateways([
        { id: a.id, sortOrder: 50 },
        { id: MISSING, sortOrder: 51 },
      ]),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const after = await payments.listGateways();
    expect(after.find((g) => g.id === a.id)?.sortOrder).toBe(40); // rolled back
  });
});
