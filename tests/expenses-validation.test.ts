import { afterEach, describe, expect, it, vi } from "vitest";
import "dotenv/config";
import {
  EXPENSE_KINDS,
  EXPENSE_STATUSES,
  amountInputSchema,
  dateOnlySchema,
  expenseCategoryInputSchema,
  expenseDateSchema,
  expenseEntryInputSchema,
  expenseKindSchema,
  expenseStatusSchema,
  todayIso,
  uuidSchema,
} from "@/modules/expenses/validation";
import { expenseKindEnum, expenseStatusEnum } from "@/modules/expenses/schema";

// Pure-unit suite for the expenses validation layer. No DB, no server-only
// imports — validation.ts is zod-only so it runs anywhere (the same contract
// as the bookings/payments validation suites). The drizzle schema import is
// also pure (pg-core table builders only) and lets the suite assert the enums
// never drift from the database's.

// service.ts imports "server-only" (it throws outside a React Server runtime);
// stub the marker so the gated integration suite below can actually run under
// vitest's node env when RUN_DB_INTEGRATION=1 — same pattern as the
// bookings/payments integration suites.
vi.mock("server-only", () => ({}));

const UUID = "3f3d5b1c-0000-4000-8000-000000000003";

describe("expense kind enum", () => {
  it("exposes the three kinds and rejects others", () => {
    expect(EXPENSE_KINDS).toEqual(["operational", "cost_of_sales", "other"]);
    for (const kind of EXPENSE_KINDS) {
      expect(expenseKindSchema.safeParse(kind).success).toBe(true);
    }
    expect(expenseKindSchema.safeParse("marketing").success).toBe(false);
    expect(expenseKindSchema.safeParse("OPERATIONAL").success).toBe(false);
    expect(expenseKindSchema.safeParse(42).success).toBe(false);
  });

  it("stays in sync with the expense_kind pg enum", () => {
    expect([...EXPENSE_KINDS]).toEqual(expenseKindEnum.enumValues);
  });
});

describe("expense status enum", () => {
  it("exposes the three statuses and rejects others", () => {
    expect(EXPENSE_STATUSES).toEqual(["pending", "approved", "rejected"]);
    for (const status of EXPENSE_STATUSES) {
      expect(expenseStatusSchema.safeParse(status).success).toBe(true);
    }
    expect(expenseStatusSchema.safeParse("paid").success).toBe(false);
    expect(expenseStatusSchema.safeParse("").success).toBe(false);
  });

  it("stays in sync with the expense_status pg enum", () => {
    expect([...EXPENSE_STATUSES]).toEqual(expenseStatusEnum.enumValues);
  });
});

describe("uuidSchema", () => {
  it("accepts a valid uuid and rejects malformed ids", () => {
    expect(uuidSchema.safeParse(UUID).success).toBe(true);
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(uuidSchema.safeParse("").success).toBe(false);
    expect(uuidSchema.safeParse(123).success).toBe(false);
  });
});

describe("expenseCategoryInputSchema", () => {
  const payload = {
    name: "Airline Tickets",
    kind: "cost_of_sales",
    description: "Direct ticket costs paid to carriers",
    isActive: true,
  };

  it("accepts a full payload and an optional id (update)", () => {
    const parsed = expenseCategoryInputSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.kind).toBe("cost_of_sales");
      expect(parsed.data.isActive).toBe(true);
    }
    expect(expenseCategoryInputSchema.safeParse({ ...payload, id: UUID }).success).toBe(true);
    expect(expenseCategoryInputSchema.safeParse({ ...payload, id: "abc" }).success).toBe(false);
  });

  it("bounds name at 1-100 and description at 500, treating blanks as absent", () => {
    expect(expenseCategoryInputSchema.safeParse({ ...payload, name: "" }).success).toBe(false);
    expect(expenseCategoryInputSchema.safeParse({ ...payload, name: "n".repeat(101) }).success).toBe(false);
    expect(expenseCategoryInputSchema.safeParse({ ...payload, name: "n".repeat(100) }).success).toBe(true);
    expect(expenseCategoryInputSchema.safeParse({ ...payload, description: "d".repeat(501) }).success).toBe(false);
    const blank = expenseCategoryInputSchema.safeParse({ ...payload, description: "   " });
    expect(blank.success).toBe(true);
    if (blank.success) expect(blank.data.description).toBeUndefined();
  });

  it("rejects unknown kinds and non-boolean isActive, defaulting isActive to true", () => {
    expect(expenseCategoryInputSchema.safeParse({ ...payload, kind: "capex" }).success).toBe(false);
    expect(expenseCategoryInputSchema.safeParse({ ...payload, isActive: "true" }).success).toBe(false);
    const defaults = expenseCategoryInputSchema.safeParse({ name: "Rent", kind: "operational" });
    expect(defaults.success).toBe(true);
    if (defaults.success) {
      expect(defaults.data.isActive).toBe(true);
      expect(defaults.data.description).toBeUndefined();
    }
  });
});

describe("amountInputSchema", () => {
  it("accepts positive amounts up to the numeric(14,2) ceiling, coercing numeric strings", () => {
    for (const amount of [0.01, 10, 10.5, 10.25, 1500, 999999999999.99, "50.25"]) {
      expect(amountInputSchema.safeParse(amount).success).toBe(true);
    }
  });

  it("rejects zero, negatives, non-finite and non-numeric values", () => {
    for (const amount of [0, -1, -0.01, NaN, Infinity, -Infinity, "abc", null]) {
      expect(amountInputSchema.safeParse(amount).success).toBe(false);
    }
  });

  it("rejects amounts above the numeric(14,2) ceiling — including exactly 1e12", () => {
    // 1e12 has 13 integer digits; numeric(14,2) tops out at 999,999,999,999.99.
    // (Payments' schema allows exactly 1e12; expenses pins the true ceiling.)
    expect(amountInputSchema.safeParse(1e12).success).toBe(false);
    expect(amountInputSchema.safeParse(1e12 + 0.01).success).toBe(false);
    expect(amountInputSchema.safeParse(1e13).success).toBe(false);
  });

  it("rejects more than two decimal places", () => {
    for (const amount of [10.123, 0.005, 1500.999, "20.555"]) {
      expect(amountInputSchema.safeParse(amount).success).toBe(false);
    }
  });
});

describe("expenseDateSchema (business date, never future)", () => {
  const today = todayIso();

  it("accepts today and past real calendar dates, trimming whitespace", () => {
    expect(expenseDateSchema.safeParse(today).success).toBe(true);
    expect(expenseDateSchema.safeParse("2000-01-01").success).toBe(true);
    expect(expenseDateSchema.safeParse("2024-02-29").success).toBe(true); // real leap day
    const trimmed = expenseDateSchema.safeParse(`  ${today}  `);
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data).toBe(today);
  });

  it("rejects tomorrow and any future date", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(expenseDateSchema.safeParse(todayIso(tomorrow)).success).toBe(false);
    expect(expenseDateSchema.safeParse("2999-12-31").success).toBe(false);
  });

  it("rejects malformed shapes and impossible calendar dates", () => {
    for (const bad of ["2026-9-6", "2026-09-6", "26-09-06", "2026/09/06", "2026-02-30", "2023-02-29", "not-a-date", "", 42]) {
      expect(expenseDateSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("dateOnlySchema (report range bounds)", () => {
  it("accepts any real calendar date, past or future, and rejects the rest", () => {
    expect(dateOnlySchema.safeParse("1999-12-31").success).toBe(true);
    expect(dateOnlySchema.safeParse("2999-12-31").success).toBe(true);
    expect(dateOnlySchema.safeParse("2026-02-30").success).toBe(false);
    expect(dateOnlySchema.safeParse("2026-9-6").success).toBe(false);
    expect(dateOnlySchema.safeParse("").success).toBe(false);
  });
});

describe("todayIso", () => {
  it("formats a known local date as YYYY-MM-DD", () => {
    expect(todayIso(new Date(2026, 8, 6))).toBe("2026-09-06"); // months are 0-based
    expect(todayIso(new Date(2026, 0, 31))).toBe("2026-01-31");
  });
});

describe("expenseEntryInputSchema", () => {
  const payload = {
    categoryId: UUID,
    amount: 1250.5,
    date: "2026-09-01",
    description: "Hotel booking for TM-2026-00042 group",
    vendor: "Hotel Sea Pearl",
    receiptUrl: "https://cdn.example.com/receipt.pdf",
    orderId: UUID,
  };

  it("accepts a full entry and a bare one (category, amount, date, description)", () => {
    const parsed = expenseEntryInputSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(1250.5);
      expect(parsed.data.vendor).toBe("Hotel Sea Pearl");
    }
    expect(
      expenseEntryInputSchema.safeParse({
        categoryId: UUID,
        amount: 10,
        date: "2026-09-01",
        description: "Taxi",
      }).success,
    ).toBe(true);
  });

  it("requires a uuid categoryId/orderId and treats blanks as absent", () => {
    expect(expenseEntryInputSchema.safeParse({ ...payload, categoryId: "abc" }).success).toBe(false);
    expect(expenseEntryInputSchema.safeParse({ ...payload, orderId: 7 }).success).toBe(false);
    const blank = expenseEntryInputSchema.safeParse({
      ...payload,
      vendor: "   ",
      receiptUrl: "",
      orderId: undefined,
    });
    expect(blank.success).toBe(true);
    if (blank.success) {
      expect(blank.data.vendor).toBeUndefined();
      expect(blank.data.receiptUrl).toBeUndefined();
      expect(blank.data.orderId).toBeUndefined();
    }
  });

  it("bounds description at 1-500 and vendor at 120", () => {
    expect(expenseEntryInputSchema.safeParse({ ...payload, description: "" }).success).toBe(false);
    expect(expenseEntryInputSchema.safeParse({ ...payload, description: "d".repeat(501) }).success).toBe(false);
    expect(expenseEntryInputSchema.safeParse({ ...payload, description: "d".repeat(500) }).success).toBe(true);
    expect(expenseEntryInputSchema.safeParse({ ...payload, vendor: "v".repeat(121) }).success).toBe(false);
    expect(expenseEntryInputSchema.safeParse({ ...payload, vendor: "v".repeat(120) }).success).toBe(true);
  });

  it("refuses non-http(s) receipt URLs", () => {
    expect(expenseEntryInputSchema.safeParse({ ...payload, receiptUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(expenseEntryInputSchema.safeParse({ ...payload, receiptUrl: "data:text/html;base64,AAAA" }).success).toBe(false);
    expect(expenseEntryInputSchema.safeParse({ ...payload, receiptUrl: "not a url" }).success).toBe(false);
    expect(expenseEntryInputSchema.safeParse({ ...payload, receiptUrl: "https://example.com/r.pdf" }).success).toBe(true);
    expect(expenseEntryInputSchema.safeParse({ ...payload, receiptUrl: "http://example.com/r.pdf" }).success).toBe(true);
  });

  it("rejects a future business date and a bad amount at the entry level", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(
      expenseEntryInputSchema.safeParse({ ...payload, date: todayIso(tomorrow) }).success,
    ).toBe(false);
    expect(expenseEntryInputSchema.safeParse({ ...payload, amount: 10.999 }).success).toBe(false);
    expect(expenseEntryInputSchema.safeParse({ ...payload, amount: 0 }).success).toBe(false);
  });
});

// ==============================================================================
// Gated integration — submit → approve/reject, category guards, P&L + margin
// ==============================================================================

const integration = process.env.RUN_DB_INTEGRATION === "1";

/** Cutoff for this run's CAPI Purchase rows (verifyPayment fires one per verification). */
const runStart = new Date();

describe.skipIf(!integration)("expenses service (integration — Postgres)", () => {
  const marker = `it-exp-${Date.now().toString(36)}${Math.floor(
    Math.random() * 1e9,
  ).toString(36)}`;
  const email = `submitter-${marker}@test.local`;
  const slugs = {
    category: `it-exp-cat-${marker}`,
    listing: `it-exp-listing-${marker}`,
  };

  /** Rows created by this run, for precise FK-safe cleanup. */
  const expenseIds: string[] = [];
  const expenseCategoryIds: string[] = [];
  const orderIds: string[] = [];
  const gatewayIds: string[] = [];

  const purge = async () => {
    const { db } = await import("@/db/client");
    const { expenses, expenseCategories } = await import("@/modules/expenses/schema");
    const { payments, paymentGateways } = await import("@/modules/payments/schema");
    const { orders, orderStatusEvents, travelers } = await import("@/modules/bookings/schema");
    const { listings, serviceCategories } = await import("@/modules/catalog/schema");
    const { users } = await import("@/modules/users/schema");
    const { trackingEvents } = await import("@/modules/tracking/schema");
    const { eq, inArray, sql } = await import("drizzle-orm");

    if (expenseIds.length > 0) {
      await db.delete(expenses).where(inArray(expenses.id, expenseIds));
    }
    if (expenseCategoryIds.length > 0) {
      await db.delete(expenseCategories).where(inArray(expenseCategories.id, expenseCategoryIds));
    }
    // Orders this run created but whose id escaped tracking — matched via the
    // run-unique customer email in the snapshot.
    const strayOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(sql`(${orders.customerSnapshot} ->> 'email') = ${email}`);
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
    await db.delete(listings).where(eq(listings.slug, slugs.listing));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, slugs.category));
    await db.delete(users).where(eq(users.email, email));
    // This run's CAPI Purchase fire-and-log rows.
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

  /** First day of the month BEFORE today (local) — a window that safely
   *  contains today in both the local and UTC calendars. */
  const firstOfPreviousMonth = (): string => {
    const today = new Date();
    return new Date(Date.UTC(today.getFullYear(), today.getMonth() - 1, 1))
      .toISOString()
      .slice(0, 10);
  };

  it("submit → approve/reject, category guards, and the P&L / service-margin numbers", async () => {
    const expensesService = await import("@/modules/expenses/service");
    const bookings = await import("@/modules/bookings/service");
    const paymentsService = await import("@/modules/payments/service");
    const { db } = await import("@/db/client");
    const { users } = await import("@/modules/users/schema");
    const { listings, serviceCategories } = await import("@/modules/catalog/schema");
    const { paymentGateways } = await import("@/modules/payments/schema");
    const { ExpenseError } = expensesService;

    // --- fixtures -------------------------------------------------------------
    const [submitter] = await db
      .insert(users)
      .values({ email, role: "staff", name: `Submitter ${marker}`, status: "active" })
      .returning({ id: users.id });

    const costCategory = await expensesService.upsertCategory({
      name: `Direct costs ${marker}`,
      kind: "cost_of_sales",
      description: "Order-linked direct costs",
      isActive: true,
    });
    expenseCategoryIds.push(costCategory.id);
    const opCategory = await expensesService.upsertCategory({
      name: `Office ${marker}`,
      kind: "operational",
      isActive: true,
    });
    expenseCategoryIds.push(opCategory.id);
    const oldCategory = await expensesService.upsertCategory({
      name: `Legacy ${marker}`,
      kind: "other",
      isActive: true,
    });
    expenseCategoryIds.push(oldCategory.id);
    const unusedCategory = await expensesService.upsertCategory({
      name: `Unused ${marker}`,
      kind: "operational",
      isActive: true,
    });
    expenseCategoryIds.push(unusedCategory.id);

    const [catalogCategory] = await db
      .insert(serviceCategories)
      .values({ name: `Margin ${marker}`, slug: slugs.category, kind: "package" })
      .returning({ id: serviceCategories.id });
    const [listing] = await db
      .insert(listings)
      .values({
        categoryId: catalogCategory.id,
        title: `Margin Package ${marker}`,
        slug: slugs.listing,
        price: "1000.00",
        currency: "BDT",
        durationDays: 3,
        status: "published",
      })
      .returning({ id: listings.id });
    const [gateway] = await db
      .insert(paymentGateways)
      .values({ name: `Exp Bank ${marker}`, kind: "manual", config: {} })
      .returning({ id: paymentGateways.id });
    gatewayIds.push(gateway.id);

    const order = await bookings.createPackageOrder(
      {
        listingId: listing.id,
        customer: { name: `Customer ${marker}`, email, phone: "+8801712345678" },
        travelers: [{ name: `Customer ${marker}` }],
      },
      { userId: submitter.id },
    );
    orderIds.push(order.id);

    // Verified payment of 1000 — the revenue side of both reports.
    const payment = await paymentsService.submitManualPayment({
      orderId: order.id,
      gatewayId: gateway.id,
      methodTxnId: `TXN-${marker}-1`,
    });
    await paymentsService.verifyPayment(payment.id, { verifiedBy: submitter.id });

    // --- entries: approved-linked, pending, rejected, operational, out-of-range
    const today = new Date().toISOString().slice(0, 10);
    const entryInput = (overrides: Record<string, unknown> = {}) => ({
      categoryId: costCategory.id,
      amount: 300,
      date: today,
      description: `Hotel for ${marker} order`,
      vendor: `Vendor ${marker}`,
      receiptUrl: "https://cdn.example.com/receipt.pdf",
      orderId: order.id,
      ...overrides,
    });

    const linked = await expensesService.submitExpense({
      input: entryInput(),
      createdBy: submitter.id,
    });
    expenseIds.push(linked.id);
    expect(linked).toMatchObject({
      status: "pending",
      amount: 300,
      currency: "BDT",
      date: today,
      categoryName: `Direct costs ${marker}`,
      categoryKind: "cost_of_sales",
      orderNo: order.orderNo,
      createdByName: `Submitter ${marker}`,
      approvedBy: null,
      approvedAt: null,
    });

    const pending = await expensesService.submitExpense({
      input: entryInput({ amount: 50, orderId: undefined, description: `Pending item ${marker}` }),
      createdBy: submitter.id,
    });
    expenseIds.push(pending.id);
    const toReject = await expensesService.submitExpense({
      input: entryInput({ amount: 20, orderId: undefined, description: `Wrong item ${marker}` }),
      createdBy: submitter.id,
    });
    expenseIds.push(toReject.id);
    const operational = await expensesService.submitExpense({
      input: entryInput({
        categoryId: opCategory.id,
        amount: 70,
        orderId: undefined,
        description: `Office rent ${marker}`,
      }),
      createdBy: submitter.id,
    });
    expenseIds.push(operational.id);
    await expensesService.approveExpense(operational.id, { approvedBy: submitter.id });
    const outOfRange = await expensesService.submitExpense({
      input: entryInput({
        categoryId: oldCategory.id,
        amount: 80,
        date: "1999-12-31",
        orderId: undefined,
        description: `Old cost ${marker}`,
      }),
      createdBy: submitter.id,
    });
    expenseIds.push(outOfRange.id);
    await expensesService.approveExpense(outOfRange.id, { approvedBy: submitter.id });

    // --- processing transitions ------------------------------------------------
    const approved = await expensesService.approveExpense(linked.id, {
      approvedBy: submitter.id,
    });
    expect(approved).toMatchObject({
      status: "approved",
      approvedBy: submitter.id,
    });
    expect(approved.approvedAt).toBeInstanceOf(Date);

    const rejected = await expensesService.rejectExpense(toReject.id, {
      approvedBy: submitter.id,
      note: "Duplicate of the hotel invoice",
    });
    expect(rejected).toMatchObject({ status: "rejected", approvedBy: submitter.id });

    // Double-processing is refused; unknown ids are NOT_FOUND.
    await expect(expensesService.approveExpense(linked.id)).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await expect(expensesService.rejectExpense(approved.id, { note: "x" })).rejects.toMatchObject({
      code: "VALIDATION",
    });
    const MISSING = "00000000-0000-4000-8000-000000000000";
    await expect(expensesService.approveExpense(MISSING)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(expensesService.rejectExpense(MISSING, { note: "x" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // --- submit guards -----------------------------------------------------------
    await expect(
      expensesService.submitExpense({ input: entryInput({ categoryId: MISSING }), createdBy: null }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      expensesService.submitExpense({ input: entryInput({ orderId: MISSING }), createdBy: null }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // An inactive category takes no new entries.
    await expensesService.setCategoryActive(unusedCategory.id, false);
    await expect(
      expensesService.submitExpense({
        input: entryInput({ categoryId: unusedCategory.id, orderId: undefined }),
        createdBy: null,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    // --- category IN_USE guards ----------------------------------------------------
    // costCategory is referenced by three entries — every deactivation path refuses.
    for (const attempt of [
      () => expensesService.setCategoryActive(costCategory.id, false),
      () => expensesService.softDeleteCategory(costCategory.id),
      () =>
        expensesService.upsertCategory({
          id: costCategory.id,
          name: costCategory.name,
          kind: "cost_of_sales",
          isActive: false,
        }),
    ]) {
      await expect(attempt()).rejects.toMatchObject({ code: "IN_USE" });
    }
    // An unreferenced category soft-deletes (deactivates) and comes back.
    const [freshCategory] = await db
      .insert((await import("@/modules/expenses/schema")).expenseCategories)
      .values({ name: `Fresh ${marker}`, kind: "operational" })
      .returning({ id: (await import("@/modules/expenses/schema")).expenseCategories.id });
    expenseCategoryIds.push(freshCategory.id);
    expect(await expensesService.softDeleteCategory(freshCategory.id)).toBe(true);
    const activeOnly = await expensesService.listCategories(true);
    expect(activeOnly.some((c) => c.id === freshCategory.id)).toBe(false);
    const restored = await expensesService.setCategoryActive(freshCategory.id, true);
    expect(restored.isActive).toBe(true);
    await expect(expensesService.setCategoryActive(MISSING, true)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // --- list + detail ---------------------------------------------------------------
    const byCategory = await expensesService.listExpenses({ categoryId: costCategory.id });
    expect(byCategory.total).toBe(3); // approved + pending + rejected
    const approvedOnly = await expensesService.listExpenses({
      status: "approved",
      categoryId: costCategory.id,
    });
    expect(approvedOnly.items.map((e) => e.id)).toEqual([linked.id]);
    const searched = await expensesService.listExpenses({ search: `office rent ${marker}` });
    expect(searched.items.map((e) => e.id)).toEqual([operational.id]);

    const detail = await expensesService.getExpenseDetail(linked.id);
    expect(detail?.orderNo).toBe(order.orderNo);
    expect(detail?.createdByName).toBe(`Submitter ${marker}`);
    expect(await expensesService.getExpenseDetail(MISSING)).toBeNull();

    // Range-validation on the read paths.
    await expect(expensesService.listExpenses({ from: "2026-02-30" })).rejects.toBeInstanceOf(
      ExpenseError,
    );
    await expect(
      expensesService.listExpenses({ from: today, to: "2020-01-01" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    // --- P&L -----------------------------------------------------------------------------
    // Window A: from the first of the previous month — contains today (local AND
    // UTC calendar), excludes the 1999-dated entry.
    const windowA = { from: firstOfPreviousMonth(), to: today };
    const pl = await expensesService.getPLReport(windowA);
    expect(pl.from).toBe(windowA.from);
    expect(pl.to).toBe(windowA.to);
    // Revenue is a global sum (other data may exist) — ours is in it.
    expect(pl.revenue).toBeGreaterThanOrEqual(1000);
    // Only APPROVED entries in-window count: 300 (linked) + 70 (operational);
    // the pending 50, the rejected 20 and the 1999-dated 80 are all out.
    const costInA = pl.expenseByCategory.find((c) => c.categoryId === costCategory.id);
    expect(costInA).toMatchObject({
      name: `Direct costs ${marker}`,
      kind: "cost_of_sales",
      amount: 300,
    });
    expect(pl.expenseByCategory.find((c) => c.categoryId === opCategory.id)?.amount).toBe(70);
    expect(pl.expenseByCategory.find((c) => c.categoryId === oldCategory.id)).toBeUndefined();
    expect(pl.expenseByMonth.some((m) => m.amount >= 300)).toBe(true);
    expect(pl.net).toBe(pl.revenue - pl.expenseTotal);

    // Window B reaches back to 1999 — the old entry joins the report.
    const plWide = await expensesService.getPLReport({ from: "1999-01-01", to: today });
    expect(plWide.expenseByCategory.find((c) => c.categoryId === oldCategory.id)?.amount).toBe(80);

    // Malformed ranges refuse with VALIDATION.
    await expect(expensesService.getPLReport({ from: "not-a-date" })).rejects.toMatchObject({
      code: "VALIDATION",
    });

    // --- service margin --------------------------------------------------------------------
    const marginRows = await expensesService.getServiceMargin(windowA);
    const marginRow = marginRows.find((r) => r.categoryId === catalogCategory.id);
    // Verified payment on this category's order minus its order-linked approved
    // expense: 1000 - 300. The unlinked operational/rejected/pending/old
    // entries hit the P&L only, never this category's margin.
    expect(marginRow).toMatchObject({
      categoryName: `Margin ${marker}`,
      revenue: 1000,
      directCost: 300,
      margin: 700,
    });
  });
});
