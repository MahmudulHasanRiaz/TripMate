import "server-only";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { escapeLike, paginate } from "@/lib/db-utils";
import { expenseCategories, expenses } from "./schema";
// Cross-module-table reads follow the established convention (bookings reads
// catalog listings; payments reads bookings orders): the expense list/detail
// join orders for the order number, and the reports join catalog taxonomy for
// the margin breakdown.
import { listings, serviceCategories } from "@/modules/catalog/schema";
import { orders } from "@/modules/bookings/schema";
import { payments } from "@/modules/payments/schema";
import { users } from "@/modules/users/schema";
import { getOrderDetail } from "@/modules/bookings/service";
import {
  dateOnlySchema,
  type ExpenseCategoryInput,
  type ExpenseEntryInput,
  type ExpenseKind,
  type ExpenseStatus,
} from "./validation";

// All DB queries for the expenses module. Server-only — importing it into a
// client bundle fails the build. Conventions mirror modules/{catalog,payments}:
//   - a typed ExpenseError for every recoverable failure (NOT_FOUND unknown
//     ids, IN_USE the category deactivation guard, VALIDATION everything the
//     caller sent in a state the rules refuse — including status conflicts on
//     approve/reject; anything else propagates to the global error boundary),
//   - numeric/date cells come back from Postgres as strings and are converted
//     to numbers/plain dates at this boundary so callers never see drizzle's
//     string representation,
//   - NO updateTag here — cache expiry belongs to the guarded actions layer
//     (which for now also tags nothing; see actions.ts).
//
// Documented v1 choices (Plan 5 T3):
//   1. REVENUE MOMENT — the P&L counts a payment on the day it was VERIFIED
//      (payments.updated_at), not the day it was submitted: an unverified
//      transfer is not income yet, and updated_at is the only column that
//      carries the verification moment (verified_by has no timestamp of its
//      own). Day-bucketing uses Postgres date()/to_char() on the timestamptz,
//      i.e. the database session timezone.
//   2. EXPENSE MOMENT — expenses are counted on their BUSINESS DATE
//      (expenses.date, the day the cost was incurred), not the day they were
//      approved. The two sides of the P&L therefore read different columns on
//      purpose: revenue realizes when money is confirmed, a cost belongs to
//      the day it happened. Both choices are applied consistently in
//      getPLReport and getServiceMargin.
//   3. softDeleteCategory is DEACTIVATION, not row death — expense_categories
//      has no deleted_at column (mirroring catalog's serviceCategories, whose
//      soft-delete is the same isActive=false write). The refuse-when-
//      referenced guard keeps history intact; the row stays for reporting.
//   4. rejectExpense accepts a note for call-site symmetry but does NOT
//      persist it — expenses has no note/reason column in v1 and the task
//      pins no schema change for it. approvedBy/approvedAt record who
//      processed the entry and when, regardless of the outcome.
//   5. The expense list joins users ONCE (createdBy → submitter name). The
//      approver stays a raw uuid in v1 — resolving a second user alias per
//      row is deferred to the frontend handoff if the UI needs the name.
//   6. expenses.order_id carries no FK (legacy table shape). submitExpense
//      still refuses an orderId no order carries (a broken link would silently
//      vanish from the service-margin report's inner join), and the list read
//      left-joins orders so an orphaned link renders as a missing number
//      rather than dropping the expense row.

// ---- public types --------------------------------------------------------------

export type Paginated<T> = { items: T[]; total: number };

export type ExpenseCategory = {
  id: string;
  name: string;
  kind: ExpenseKind;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ExpenseEntry = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryKind: ExpenseKind;
  amount: number;
  currency: string;
  /** The business date (YYYY-MM-DD) the cost was incurred. */
  date: string;
  description: string | null;
  vendor: string | null;
  receiptUrl: string | null;
  orderId: string | null;
  /** Joined from orders — null for unlinked expenses AND orphaned links. */
  orderNo: string | null;
  createdBy: string | null;
  /** Display name of the submitting user (null = guest/system entry). */
  createdByName: string | null;
  status: ExpenseStatus;
  /** The user who approved OR rejected the entry (processed-by). */
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
};

export type ExpenseListQuery = {
  status?: ExpenseStatus;
  categoryId?: string;
  /** Business-date window bounds (YYYY-MM-DD), inclusive. */
  from?: string;
  to?: string;
  /** Free-text search across description + vendor. */
  search?: string;
  page?: number;
  perPage?: number;
};

export type ReportRange = {
  /** Inclusive window bounds (YYYY-MM-DD). Both optional — absent means
   *  unbounded on that side (an all-time report). */
  from?: string;
  to?: string;
};

export type PLCategoryAmount = {
  categoryId: string;
  name: string;
  kind: ExpenseKind;
  amount: number;
};

export type PLMonthAmount = { ym: string; amount: number };

export type PLReport = {
  from: string | null;
  to: string | null;
  /** Sum of VERIFIED payments in range (choice 1 in the module header). */
  revenue: number;
  /** Sum of APPROVED expenses in range (choice 2 in the module header). */
  expenseTotal: number;
  net: number;
  expenseByCategory: PLCategoryAmount[];
  revenueByMonth: PLMonthAmount[];
  expenseByMonth: PLMonthAmount[];
};

export type ServiceMarginRow = {
  categoryId: string;
  categoryName: string;
  /** Verified payments on this category's orders (choice 1). */
  revenue: number;
  /** Approved, order-linked expenses on this category's orders (choice 2). */
  directCost: number;
  margin: number;
};

// ---- errors --------------------------------------------------------------------

export class ExpenseError extends Error {
  constructor(
    public code: "NOT_FOUND" | "IN_USE" | "VALIDATION",
    message: string,
  ) {
    super(message);
    this.name = "ExpenseError";
  }
}

// ---- row helpers ----------------------------------------------------------------

type CategoriesRow = typeof expenseCategories.$inferSelect;

function toCategory(row: CategoriesRow): ExpenseCategory {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const expenseListCols = {
  id: expenses.id,
  categoryId: expenses.categoryId,
  amount: expenses.amount,
  currency: expenses.currency,
  date: expenses.date,
  description: expenses.description,
  vendor: expenses.vendor,
  receiptUrl: expenses.receiptUrl,
  orderId: expenses.orderId,
  createdBy: expenses.createdBy,
  status: expenses.status,
  approvedBy: expenses.approvedBy,
  approvedAt: expenses.approvedAt,
  createdAt: expenses.createdAt,
  categoryName: expenseCategories.name,
  categoryKind: expenseCategories.kind,
  createdByName: users.name,
  orderNo: orders.orderNo,
} as const;

type ExpenseRow = {
  id: string;
  categoryId: string;
  amount: string;
  currency: string;
  date: string;
  description: string | null;
  vendor: string | null;
  receiptUrl: string | null;
  orderId: string | null;
  createdBy: string | null;
  status: ExpenseStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  categoryName: string;
  categoryKind: ExpenseKind;
  createdByName: string | null;
  orderNo: string | null;
};

function toExpenseEntry(row: ExpenseRow): ExpenseEntry {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categoryKind: row.categoryKind,
    amount: Number(row.amount),
    currency: row.currency,
    date: row.date,
    description: row.description,
    vendor: row.vendor,
    receiptUrl: row.receiptUrl,
    orderId: row.orderId,
    orderNo: row.orderNo,
    createdBy: row.createdBy,
    createdByName: row.createdByName,
    status: row.status,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    createdAt: row.createdAt,
  };
}

function expenseQuery() {
  return db
    .select(expenseListCols)
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .leftJoin(users, eq(expenses.createdBy, users.id))
    .leftJoin(orders, eq(expenses.orderId, orders.id));
}

/** Validate one report/list range bound (YYYY-MM-DD real date) or throw. */
function parseRangeBound(value: string, label: string): string {
  const parsed = dateOnlySchema.safeParse(value);
  if (!parsed.success) {
    throw new ExpenseError("VALIDATION", `${label} must be a valid date (YYYY-MM-DD).`);
  }
  return parsed.data;
}

/** Normalize + validate a {from?, to?} range; throws VALIDATION on a malformed
 *  bound or an inverted window. Returns nulls for absent bounds. */
function parseRange(range: ReportRange): { from: string | null; to: string | null } {
  const from = range.from === undefined ? null : parseRangeBound(range.from, "'from'");
  const to = range.to === undefined ? null : parseRangeBound(range.to, "'to'");
  if (from && to && from > to) {
    throw new ExpenseError("VALIDATION", "'from' must not be after 'to'.");
  }
  return { from, to };
}

/** Business-date window conditions on the expenses table (date column). */
function expenseDateConditions(from: string | null, to: string | null): SQL[] {
  const conditions: SQL[] = [];
  if (from) conditions.push(gte(expenses.date, from));
  if (to) conditions.push(lte(expenses.date, to));
  return conditions;
}

/** Verification-moment window conditions on payments (choice 1: the day the
 *  payment was VERIFIED, read off updated_at with an explicit ::date cast). */
function paymentVerifiedConditions(from: string | null, to: string | null): SQL[] {
  const conditions: SQL[] = [eq(payments.status, "verified")];
  if (from) conditions.push(sql`date(${payments.updatedAt}) >= ${from}::date`);
  if (to) conditions.push(sql`date(${payments.updatedAt}) <= ${to}::date`);
  return conditions;
}

// ---- categories: reads -----------------------------------------------------------

/** All expense categories ordered by name; `activeOnly` filters to the ones
 *  that accept new submissions. */
export async function listCategories(activeOnly: boolean): Promise<ExpenseCategory[]> {
  const rows = await db
    .select()
    .from(expenseCategories)
    .where(activeOnly ? eq(expenseCategories.isActive, true) : undefined)
    .orderBy(expenseCategories.name);
  return rows.map(toCategory);
}

// ---- categories: writes ----------------------------------------------------------

/** Every expense references its category (there is no soft delete on expenses
 *  rows), so the IN_USE guard counts plain references. */
async function countExpensesForCategory(categoryId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(expenses)
    .where(eq(expenses.categoryId, categoryId));
  return row.total;
}

/**
 * Insert or update a category (`input.id` present → update). Mirrors catalog's
 * upsertCategory guard: an edit that would DEACTIVATE a still-referenced
 * category is refused with IN_USE (active→active, inactive→active and new
 * rows are unaffected). An unknown id surfaces as NOT_FOUND.
 */
export async function upsertCategory(input: ExpenseCategoryInput): Promise<ExpenseCategory> {
  if (input.id && !input.isActive) {
    const [existing] = await db
      .select({ isActive: expenseCategories.isActive })
      .from(expenseCategories)
      .where(eq(expenseCategories.id, input.id))
      .limit(1);
    if (existing?.isActive) {
      const referencing = await countExpensesForCategory(input.id);
      if (referencing > 0) {
        throw new ExpenseError(
          "IN_USE",
          `Category cannot be deactivated — ${referencing} expense(s) still reference it.`,
        );
      }
    }
  }

  const values = {
    name: input.name,
    kind: input.kind,
    description: input.description ?? null,
    isActive: input.isActive,
    updatedAt: new Date(),
  };

  let row: CategoriesRow | undefined;
  if (input.id) {
    const rows = await db
      .update(expenseCategories)
      .set(values)
      .where(eq(expenseCategories.id, input.id))
      .returning();
    row = rows[0];
    if (!row) throw new ExpenseError("NOT_FOUND", `Expense category ${input.id} not found.`);
  } else {
    const rows = await db.insert(expenseCategories).values(values).returning();
    row = rows[0];
  }
  return toCategory(row);
}

/**
 * Flip a category's active flag. active→false runs the same IN_USE guard as
 * upsert: deactivated categories stop accepting new entries, but only after
 * nothing references them. (false→false and false→true are free.)
 */
export async function setCategoryActive(
  id: string,
  isActive: boolean,
): Promise<ExpenseCategory> {
  if (!isActive) {
    const [existing] = await db
      .select({ isActive: expenseCategories.isActive })
      .from(expenseCategories)
      .where(eq(expenseCategories.id, id))
      .limit(1);
    if (existing?.isActive) {
      const referencing = await countExpensesForCategory(id);
      if (referencing > 0) {
        throw new ExpenseError(
          "IN_USE",
          `Category cannot be deactivated — ${referencing} expense(s) still reference it.`,
        );
      }
    }
  }

  const [row] = await db
    .update(expenseCategories)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(expenseCategories.id, id))
    .returning();
  if (!row) throw new ExpenseError("NOT_FOUND", `Expense category ${id} not found.`);
  return toCategory(row);
}

/**
 * Soft-delete a category: refuse (IN_USE) while any expense references it,
 * else deactivate (choice 3 — there is no deleted_at column; the row stays
 * for reporting and can be reactivated anytime).
 */
export async function softDeleteCategory(id: string): Promise<boolean> {
  const referencing = await countExpensesForCategory(id);
  if (referencing > 0) {
    throw new ExpenseError(
      "IN_USE",
      `Category cannot be deleted — ${referencing} expense(s) still reference it.`,
    );
  }
  const [row] = await db
    .update(expenseCategories)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(expenseCategories.id, id))
    .returning({ id: expenseCategories.id });
  return Boolean(row);
}

// ---- entries: reads ---------------------------------------------------------------

/** One expense (joined for display), or null when the id is unknown. */
export async function getExpenseDetail(id: string): Promise<ExpenseEntry | null> {
  const [row] = await expenseQuery().where(eq(expenses.id, id)).limit(1);
  return row ? toExpenseEntry(row as unknown as ExpenseRow) : null;
}

/**
 * Admin list read: status/category/date-window filters + free-text search
 * (description, vendor), newest business-date first, joined category +
 * submitter + order number. perPage defaults to 20 and caps at 50.
 */
export async function listExpenses(
  query: ExpenseListQuery = {},
): Promise<Paginated<ExpenseEntry>> {
  const from = query.from === undefined ? null : parseRangeBound(query.from, "'from'");
  const to = query.to === undefined ? null : parseRangeBound(query.to, "'to'");
  if (from && to && from > to) {
    throw new ExpenseError("VALIDATION", "'from' must not be after 'to'.");
  }

  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(expenses.status, query.status));
  if (query.categoryId) conditions.push(eq(expenses.categoryId, query.categoryId));
  conditions.push(...expenseDateConditions(from, to));
  const search = query.search?.trim();
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    conditions.push(
      or(ilike(expenses.description, pattern), ilike(expenses.vendor, pattern)) as SQL,
    );
  }

  const where = and(...conditions);
  const { offset, perPage } = paginate({ page: query.page, perPage: query.perPage, defaultPerPage: 20 });

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(expenses)
    .where(where);
  const rows = (await expenseQuery()
    .where(where)
    .orderBy(desc(expenses.date), desc(expenses.createdAt), desc(expenses.id))
    .limit(perPage)
    .offset(offset)) as unknown as ExpenseRow[];

  return { items: rows.map(toExpenseEntry), total: countRow.total };
}

// ---- entries: writes ----------------------------------------------------------------

/**
 * Submit an expense entry: status pending, awaiting approval. Guards: the
 * category must exist AND be active (deactivated categories stop accepting
 * entries — the catalog INVALID_REFERENCE convention, expressed with this
 * module's VALIDATION code); an optional orderId must reference a real order
 * (the column carries no FK, so the service is the integrity check).
 */
export async function submitExpense(opts: {
  input: ExpenseEntryInput;
  createdBy: string | null;
}): Promise<ExpenseEntry> {
  const { input, createdBy } = opts;

  const [category] = await db
    .select({ isActive: expenseCategories.isActive })
    .from(expenseCategories)
    .where(eq(expenseCategories.id, input.categoryId))
    .limit(1);
  if (!category) {
    throw new ExpenseError(
      "NOT_FOUND",
      "The selected expense category no longer exists.",
    );
  }
  if (!category.isActive) {
    throw new ExpenseError(
      "VALIDATION",
      "The selected expense category is inactive — reactivate it before submitting expenses under it.",
    );
  }

  if (input.orderId) {
    const order = await getOrderDetail(input.orderId);
    if (!order) throw new ExpenseError("NOT_FOUND", `Order ${input.orderId} not found.`);
  }

  const [inserted] = await db
    .insert(expenses)
    .values({
      categoryId: input.categoryId,
      amount: input.amount.toFixed(2),
      date: input.date,
      description: input.description,
      vendor: input.vendor ?? null,
      receiptUrl: input.receiptUrl ?? null,
      orderId: input.orderId ?? null,
      createdBy,
      status: "pending",
    })
    .returning({ id: expenses.id });

  const detail = await getExpenseDetail(inserted.id);
  if (!detail) throw new ExpenseError("NOT_FOUND", `Expense ${inserted.id} not found.`);
  return detail;
}

/** Shared guard + write for the two processing transitions: only a PENDING
 *  expense may be approved or rejected (anything else is VALIDATION), and the
 *  processor + processing moment land together on the row. */
async function processExpense(
  id: string,
  status: "approved" | "rejected",
  opts: { approvedBy?: string | null },
): Promise<ExpenseEntry> {
  const current = await getExpenseDetail(id);
  if (!current) throw new ExpenseError("NOT_FOUND", `Expense ${id} not found.`);
  if (current.status !== "pending") {
    throw new ExpenseError(
      "VALIDATION",
      `Only pending expenses can be ${status} (current: ${current.status}).`,
    );
  }

  const [row] = await db
    .update(expenses)
    .set({ status, approvedBy: opts.approvedBy ?? null, approvedAt: new Date() })
    .where(eq(expenses.id, id))
    .returning({ id: expenses.id });
  if (!row) throw new ExpenseError("NOT_FOUND", `Expense ${id} not found.`);

  const detail = await getExpenseDetail(id);
  if (!detail) throw new ExpenseError("NOT_FOUND", `Expense ${id} not found.`);
  return detail;
}

/** Approve a pending expense — it starts counting in the P&L reports. */
export async function approveExpense(
  id: string,
  opts: { approvedBy?: string | null } = {},
): Promise<ExpenseEntry> {
  return processExpense(id, "approved", opts);
}

/**
 * Reject a pending expense. The note is accepted for call-site symmetry but
 * NOT persisted in v1 — expenses has no note column (choice 4 in the module
 * header); approvedBy/approvedAt are the audit trail.
 */
export async function rejectExpense(
  id: string,
  opts: { approvedBy?: string | null; note?: string | null } = {},
): Promise<ExpenseEntry> {
  return processExpense(id, "rejected", { approvedBy: opts.approvedBy });
}

// ---- reports ---------------------------------------------------------------------------

/**
 * Profit & loss for a window: verified-payment revenue vs approved-expense
 * total, with per-category and per-month breakdowns. All figures are SQL
 * SUMs over parameterized aggregates (numeric comes back exact; JS only
 * converts the final strings). See the module header for the two moment
 * choices (revenue = verification day, expenses = business date).
 */
export async function getPLReport(range: ReportRange = {}): Promise<PLReport> {
  const { from, to } = parseRange(range);

  const expenseWhere = and(
    eq(expenses.status, "approved"),
    ...expenseDateConditions(from, to),
  );
  const revenueWhere = and(...paymentVerifiedConditions(from, to));

  const expenseYm = sql`to_char(${expenses.date}, 'YYYY-MM')`;
  const revenueYm = sql`to_char(date(${payments.updatedAt}), 'YYYY-MM')`;

  const [revenueRow, expenseRow, byCategory, revenueMonths, expenseMonths] =
    await Promise.all([
      db
        .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .where(revenueWhere),
      db
        .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
        .from(expenses)
        .where(expenseWhere),
      db
        .select({
          categoryId: expenseCategories.id,
          name: expenseCategories.name,
          kind: expenseCategories.kind,
          amount: sql<string>`sum(${expenses.amount})`,
        })
        .from(expenses)
        .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
        .where(expenseWhere)
        .groupBy(expenseCategories.id, expenseCategories.name, expenseCategories.kind)
        .orderBy(desc(sql`sum(${expenses.amount})`)),
      db
        .select({
          ym: sql<string>`${revenueYm}`,
          amount: sql<string>`sum(${payments.amount})`,
        })
        .from(payments)
        .where(revenueWhere)
        .groupBy(revenueYm)
        .orderBy(revenueYm),
      db
        .select({
          ym: sql<string>`${expenseYm}`,
          amount: sql<string>`sum(${expenses.amount})`,
        })
        .from(expenses)
        .where(expenseWhere)
        .groupBy(expenseYm)
        .orderBy(expenseYm),
    ]);

  const revenue = Number(revenueRow[0]?.total ?? 0);
  const expenseTotal = Number(expenseRow[0]?.total ?? 0);

  return {
    from,
    to,
    revenue,
    expenseTotal,
    net: revenue - expenseTotal,
    expenseByCategory: byCategory.map((row) => ({
      categoryId: row.categoryId,
      name: row.name,
      kind: row.kind,
      amount: Number(row.amount),
    })),
    revenueByMonth: revenueMonths.map((row) => ({ ym: row.ym, amount: Number(row.amount) })),
    expenseByMonth: expenseMonths.map((row) => ({ ym: row.ym, amount: Number(row.amount) })),
  };
}

/**
 * Service margin per LISTING category (catalog taxonomy): verified-payment
 * revenue on that category's orders minus the approved expenses linked to
 * those same orders (direct cost). Unlinked operational expenses are NOT part
 * of this view — they hit the P&L, not a category's margin. Orders without a
 * listing (general inquiries) and orphaned expense.order_id links have no
 * category and therefore drop out of the inner joins; soft-DELETED listings
 * still count (the money was real — the join reads the row, not its status).
 *
 * Only categories with activity in the window appear (a category with neither
 * revenue nor direct cost has a trivially zero margin and would only add
 * noise); rows sort by name.
 */
export async function getServiceMargin(range: ReportRange = {}): Promise<ServiceMarginRow[]> {
  const { from, to } = parseRange(range);

  const [revenueRows, costRows] = await Promise.all([
    db
      .select({
        categoryId: serviceCategories.id,
        categoryName: serviceCategories.name,
        amount: sql<string>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .innerJoin(listings, eq(orders.listingId, listings.id))
      .innerJoin(serviceCategories, eq(listings.categoryId, serviceCategories.id))
      .where(and(...paymentVerifiedConditions(from, to)))
      .groupBy(serviceCategories.id, serviceCategories.name),
    db
      .select({
        categoryId: serviceCategories.id,
        categoryName: serviceCategories.name,
        amount: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .innerJoin(orders, eq(expenses.orderId, orders.id))
      .innerJoin(listings, eq(orders.listingId, listings.id))
      .innerJoin(serviceCategories, eq(listings.categoryId, serviceCategories.id))
      .where(and(eq(expenses.status, "approved"), ...expenseDateConditions(from, to)))
      .groupBy(serviceCategories.id, serviceCategories.name),
  ]);

  const merged = new Map<string, { categoryName: string; revenue: number; directCost: number }>();
  for (const row of revenueRows) {
    merged.set(row.categoryId, {
      categoryName: row.categoryName,
      revenue: Number(row.amount),
      directCost: 0,
    });
  }
  for (const row of costRows) {
    const existing = merged.get(row.categoryId);
    if (existing) {
      existing.directCost = Number(row.amount);
    } else {
      merged.set(row.categoryId, {
        categoryName: row.categoryName,
        revenue: 0,
        directCost: Number(row.amount),
      });
    }
  }

  return [...merged.entries()]
    .map(([categoryId, row]) => ({
      categoryId,
      categoryName: row.categoryName,
      revenue: row.revenue,
      directCost: row.directCost,
      margin: row.revenue - row.directCost,
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}
