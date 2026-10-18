import "server-only";
import { and, eq, sql, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db/client";
import { withTimeout } from "@/lib/with-timeout";
// Cross-module-table reads follow the established convention (bookings reads
// catalog listings; expenses reads bookings orders + payments + catalog): the
// dashboard is an aggregate over every funnel table, and it reuses
// bookings.getOrderBoardCounts verbatim instead of re-deriving the order
// histogram (one more GROUP BY query in the same parallel round).
import { getOrderBoardCounts, type OrderBoardCounts } from "@/modules/bookings/service";
import { leads } from "@/modules/leads/schema";
import { orders } from "@/modules/bookings/schema";
import { payments } from "@/modules/payments/schema";
import { expenses } from "@/modules/expenses/schema";

// All DB queries for the admin dashboard. Server-only — importing it into a
// client bundle fails the build. Conventions mirror modules/expenses getPLReport
// (the closest existing pattern — SQL aggregates + date buckets):
//   - every KPI/trend figure is a SQL aggregate (count/sum in the database,
//     never a full-table scan into JS); numeric sums come back as exact strings
//     and are converted with Number() only at this boundary,
//   - NO actions file and NO 'use cache': admin pages are dynamic server
//     components (instant=false), so these are plain uncached async reads and
//     the admin layout's route guard is the only access control,
//   - NO updateTag — the dashboard never writes.
//
// Moment choices (applied consistently, and identical to the expenses P&L):
//   1. REVENUE MOMENT — revenue counts a payment on the day it was VERIFIED
//      (payments.updated_at), the same choice the P&L makes. An unverified
//      transfer is not income yet.
//   2. EXPENSE MOMENT — expenses count on their BUSINESS DATE
//      (expenses.date), the day the cost was incurred, not the approval day.
//   3. TIMEZONE — every day/month bucket (date(), date_trunc(), current_date)
//      is evaluated in the database session timezone, so all figures on one
//      dashboard card are mutually consistent.
//   4. TREND SERIES — the frontend chart must never see a gap: the series is
//      continuous over the whole window with zero-filled days, anchored on the
//      DATABASE's current_date (not the Node clock) so the day labels and the
//      SQL day buckets can never drift apart across timezones.

// ---- public types ---------------------------------------------------------------

export type DashboardKpis = {
  /** Leads whose createdAt day is today (DB session timezone). */
  leadsToday: number;
  leadsTotal: number;
  /** converted / total * 100, rounded to 1 decimal place; 0 when there are no leads. */
  leadConversionRate: number;
  /** Order board histogram — the exact shape of bookings getOrderBoardCounts. */
  ordersByStatus: OrderBoardCounts;
  /** Payments sitting in the verification queue (status 'submitted'). */
  pendingPaymentsCount: number;
  /** Leads with no assignee (assigned_to is null). */
  unassignedLeadsCount: number;
  /** Sum of VERIFIED payments verified this month (updated_at in the current month). */
  revenueThisMonth: number;
  /** Direct cost of sales / COGS for orders this month. */
  costOfSalesThisMonth: number;
  /** Gross profit = revenueThisMonth - costOfSalesThisMonth. */
  grossProfitThisMonth: number;
  /** Gross margin percentage. */
  grossMarginPercent: number;
  /** Sum of APPROVED expenses whose business date falls in the current month. */
  expensesThisMonth: number;
  /** Net profit = grossProfitThisMonth - expensesThisMonth. */
  netThisMonth: number;
  /** Net margin percentage. */
  netMarginPercent: number;
  /** Expenses awaiting approval (status 'pending'). */
  pendingExpensesCount: number;
};

export type DashboardTrendPoint = {
  /** Calendar day, 'YYYY-MM-DD'. */
  date: string;
  /** Leads created this day (leads.created_at). */
  leads: number;
  /** Orders created this day (orders.created_at). */
  orders: number;
  /** Verified payments verified this day (payments.updated_at) — choice 1 above. */
  revenue: number;
};

// ---- shared helpers ---------------------------------------------------------------

/** Day-string arithmetic on 'YYYY-MM-DD' values using UTC midnights only —
 *  never the local timezone, so day labels stay exact on any host. */
function shiftIsoDay(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** Sanitize the trend window: a whole number of days, clamped to [1, 365].
 *  (Missing/invalid input falls back to the 30-day default rather than
 *  throwing — a chart range is not worth an error boundary.) */
function clampDays(days: number | undefined): number {
  if (days === undefined || !Number.isFinite(days)) return 30;
  return Math.min(365, Math.max(1, Math.floor(days)));
}

export const DASHBOARD_QUERY_TIMEOUT_MS = 30_000;

/**
 * Guard any DB query promise with a strict deadline so dashboard queries
 * never hang forever on pooler stalls or network drops. The pool bounds
 * execution server-side (statement_timeout in db/connection.ts); this bounds
 * the user's wait — a late-but-healthy query surfaces as the dashboard's
 * error card instead of a blank page hanging for minutes, and the pool
 * self-heals in the background.
 */
export async function withQueryTimeout<T>(
  promise: Promise<T>,
  ms = DASHBOARD_QUERY_TIMEOUT_MS,
  label = "dashboard-query",
): Promise<T> {
  return withTimeout(promise, ms, `Dashboard query timed out after ${ms}ms [${label}]`);
}

// ---- KPIs -------------------------------------------------------------------------

/**
 * Every headline figure for the dashboard, in ONE round of parallel SQL
 * aggregates:
 *   - leads: a single count with FILTERed variants (total, converted, today,
 *     unassigned) — one pass over the table instead of four queries,
 *   - payments: submitted count + verified-this-month sum, FILTERed in one pass,
 *   - expenses: pending count + approved-this-month sum, FILTERed in one pass,
 *   - ordersByStatus: the existing bookings getOrderBoardCounts (one GROUP BY),
 *     reused verbatim so the dashboard and the orders board can never disagree.
 */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const [leadRows, paymentRows, expenseRows, orderRows, ordersByStatus] =
    await withQueryTimeout(
      Promise.all([
        db
          .select({
            total: sql<number>`count(*)::int`,
            converted: sql<number>`(count(*) filter (where ${leads.status} = 'converted'))::int`,
            today: sql<number>`(count(*) filter (where ${leads.createdAt} >= current_date AND ${leads.createdAt} < current_date + 1))::int`,
            unassigned: sql<number>`(count(*) filter (where ${leads.assignedTo} is null))::int`,
          })
          .from(leads),
        db
          .select({
            submitted: sql<number>`(count(*) filter (where ${payments.status} = 'submitted'))::int`,
            revenueThisMonth: sql<string>`coalesce(
              (sum(${payments.amount}) filter (
                where ${payments.status} = 'verified'
                  and ${payments.updatedAt} >= date_trunc('month', current_date)
                  and ${payments.updatedAt} < date_trunc('month', current_date) + interval '1 month'
              )),
              0
            )`,
          })
          .from(payments),
        db
          .select({
            pending: sql<number>`(count(*) filter (where ${expenses.status} = 'pending'))::int`,
            approvedThisMonth: sql<string>`coalesce(
              (sum(${expenses.amount}) filter (
                where ${expenses.status} = 'approved'
                  and ${expenses.date} >= date_trunc('month', current_date)::date
              )),
              0
            )`,
          })
          .from(expenses),
        db
          .select({
            costOfSalesThisMonth: sql<string>`coalesce(
              (sum(${orders.costPrice}) filter (
                where ${orders.status} in ('confirmed', 'completed')
                  and ${orders.updatedAt} >= date_trunc('month', current_date)
                  and ${orders.updatedAt} < date_trunc('month', current_date) + interval '1 month'
              )),
              0
            )`,
          })
          .from(orders),
        getOrderBoardCounts(),
      ]),
      DASHBOARD_QUERY_TIMEOUT_MS,
      "kpis",
    );

  const leadsTotal = leadRows[0]?.total ?? 0;
  const leadsConverted = leadRows[0]?.converted ?? 0;
  const revenueThisMonth = Number(paymentRows[0]?.revenueThisMonth ?? 0);
  const costOfSalesThisMonth = Number(orderRows[0]?.costOfSalesThisMonth ?? 0);
  const grossProfitThisMonth = Math.max(0, revenueThisMonth - costOfSalesThisMonth);
  const grossMarginPercent =
    revenueThisMonth > 0 ? Math.round((grossProfitThisMonth / revenueThisMonth) * 1000) / 10 : 0;
  const expensesThisMonth = Number(expenseRows[0]?.approvedThisMonth ?? 0);
  const netThisMonth = grossProfitThisMonth - expensesThisMonth;
  const netMarginPercent =
    revenueThisMonth > 0 ? Math.round((netThisMonth / revenueThisMonth) * 1000) / 10 : 0;

  return {
    leadsToday: leadRows[0]?.today ?? 0,
    leadsTotal,
    leadConversionRate:
      leadsTotal === 0 ? 0 : Math.round((leadsConverted / leadsTotal) * 1000) / 10,
    ordersByStatus,
    pendingPaymentsCount: paymentRows[0]?.submitted ?? 0,
    unassignedLeadsCount: leadRows[0]?.unassigned ?? 0,
    revenueThisMonth,
    costOfSalesThisMonth,
    grossProfitThisMonth,
    grossMarginPercent,
    expensesThisMonth,
    netThisMonth,
    netMarginPercent,
    pendingExpensesCount: expenseRows[0]?.pending ?? 0,
  };
}

// ---- range dashboard (§2.10) ---------------------------------------------------------

/** Supported dashboard presets. Custom = explicit from/to (YYYY-MM-DD). */
export type DashboardPreset = "today" | "week" | "month" | "custom";

export type DashboardRange = {
  preset: DashboardPreset;
  from: string;
  to: string;
};

/** Resolve a preset to an inclusive [from, to] day range (DB current_date). */
export async function resolveDashboardRange(opts: {
  preset?: DashboardPreset;
  from?: string;
  to?: string;
}): Promise<DashboardRange> {
  const preset: DashboardPreset =
    opts.preset === "today" || opts.preset === "week" || opts.preset === "custom"
      ? opts.preset
      : "month";
  const isDay = (v: string | undefined): v is string =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (preset === "custom" && isDay(opts.from) && isDay(opts.to) && opts.from <= opts.to) {
    return { preset, from: opts.from, to: opts.to };
  }
  const rows = await withQueryTimeout(
    db.execute(
      sql`select to_char(current_date, 'YYYY-MM-DD') as today,
        to_char(date_trunc('week', current_date)::date, 'YYYY-MM-DD') as week_start,
        to_char(date_trunc('month', current_date)::date, 'YYYY-MM-DD') as month_start`,
    ) as unknown as Promise<{ today: string; week_start: string; month_start: string }[]>,
    DASHBOARD_QUERY_TIMEOUT_MS,
    "range-anchor",
  ).catch(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [{ today, week_start: today, month_start: today.slice(0, 7) + "-01" }];
  });
  const anchor = rows[0] ?? null;
  const today = anchor?.today ?? new Date().toISOString().slice(0, 10);
  if (preset === "today") return { preset, from: today, to: today };
  if (preset === "week") return { preset, from: anchor?.week_start ?? today, to: today };
  return { preset: "month", from: anchor?.month_start ?? today, to: today };
}

export type DashboardRangeKpis = {
  range: DashboardRange;
  days: number;
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  grossMarginPercent: number;
  expenses: number;
  net: number;
  netMarginPercent: number;
  leads: number;
  leadConversionRate: number;
  /** Outstanding due across ALL open orders (total − verified paid). */
  pendingCollections: number;
  followUpsDue: number;
  pendingPaymentsCount: number;
  pendingExpensesCount: number;
};

export type LeadFunnelPoint = { status: string; count: number };
export type ProfitByServicePoint = { type: string; revenue: number; profit: number };

/** Day count between two YYYY-MM-DD dates, inclusive, min 1. */
function rangeDays(from: string, to: string): number {
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.min(365, Math.max(1, Math.round(ms / 86_400_000) + 1));
}

/**
 * Range KPIs in ONE parallel round of SQL aggregates. Revenue = verified
 * payments by updated day; cost = costPrice of confirmed/completed orders by
 * updated day; expenses = approved by business date; leads created by day.
 * pendingCollections is range-independent (global outstanding).
 */
export async function getDashboardRangeKpis(range: DashboardRange): Promise<DashboardRangeKpis> {
  const from = sql`(${range.from}::date)`;
  const to = sql`(${range.to}::date)`;
  const inRange = (col: SQLWrapper) =>
    sql`${col} >= ${from}::timestamp AND ${col} < (${to}::date + 1)::timestamp`;

  const [payRows, orderRows, expRows, leadRows, dueRows, fuRows] =
    await withQueryTimeout(
      Promise.all([
        db
          .select({
            revenue: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'verified' and ${inRange(payments.updatedAt)}), 0)`,
            submitted: sql<number>`(count(*) filter (where ${payments.status} = 'submitted'))::int`,
          })
          .from(payments),
        db
          .select({
            cost: sql<string>`coalesce(sum(${orders.costPrice}) filter (where ${orders.status} in ('confirmed', 'completed') and ${inRange(orders.updatedAt)}), 0)`,
            openTotal: sql<string>`coalesce(sum(coalesce(${orders.finalPrice}, ${orders.quotedPrice}, 0)) filter (where ${orders.status} in ('pending', 'confirmed')), 0)`,
          })
          .from(orders),
        db
          .select({
            approved: sql<string>`coalesce(sum(${expenses.amount}) filter (where ${expenses.status} = 'approved' and ${expenses.date} >= ${from} and ${expenses.date} <= ${to}), 0)`,
            pending: sql<number>`(count(*) filter (where ${expenses.status} = 'pending'))::int`,
          })
          .from(expenses),
        db
          .select({
            total: sql<number>`(count(*) filter (where ${inRange(leads.createdAt)}))::int`,
            converted: sql<number>`(count(*) filter (where ${inRange(leads.createdAt)} and ${leads.status} = 'converted'))::int`,
          })
          .from(leads),
        db
          .select({
            verifiedPaid: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'verified'), 0)`,
          })
          .from(payments),
        db
          .select({ due: sql<number>`count(*)::int` })
          .from(leads)
          .where(
            and(
              sql`${leads.nextFollowUpAt} <= now()`,
              sql`${leads.status} not in ('converted', 'lost')`,
            ),
          ),
      ]),
      DASHBOARD_QUERY_TIMEOUT_MS,
      "range-kpis",
    );

  const revenue = Number(payRows[0]?.revenue ?? 0);
  const costOfSales = Number(orderRows[0]?.cost ?? 0);
  const grossProfit = Math.max(0, revenue - costOfSales);
  const grossMarginPercent =
    revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;
  const expensesTotal = Number(expRows[0]?.approved ?? 0);
  const net = grossProfit - expensesTotal;
  const netMarginPercent = revenue > 0 ? Math.round((net / revenue) * 1000) / 10 : 0;
  const leadsTotal = leadRows[0]?.total ?? 0;
  const openTotal = Number(orderRows[0]?.openTotal ?? 0);
  const verifiedPaidAll = Number(dueRows[0]?.verifiedPaid ?? 0);

  return {
    range,
    days: rangeDays(range.from, range.to),
    revenue,
    costOfSales,
    grossProfit,
    grossMarginPercent,
    expenses: expensesTotal,
    net,
    netMarginPercent,
    leads: leadsTotal,
    leadConversionRate:
      leadsTotal === 0
        ? 0
        : Math.round(((leadRows[0]?.converted ?? 0) / leadsTotal) * 1000) / 10,
    pendingCollections: Math.max(0, openTotal - verifiedPaidAll),
    followUpsDue: fuRows[0]?.due ?? 0,
    pendingPaymentsCount: payRows[0]?.submitted ?? 0,
    pendingExpensesCount: expRows[0]?.pending ?? 0,
  };
}

/** Lead funnel by stage (counts per status, board order). */
export async function getLeadFunnel(): Promise<LeadFunnelPoint[]> {
  const { getLeadBoardCounts } = await import("@/modules/leads/service");
  const { LEAD_STATUSES } = await import("@/modules/leads/validation");
  const counts = await withQueryTimeout(getLeadBoardCounts(), DASHBOARD_QUERY_TIMEOUT_MS, "lead-funnel");
  return LEAD_STATUSES.filter((s) => s !== "converted" && s !== "lost").map((status) => ({
    status,
    count: counts[status] ?? 0,
  }));
}

/** 30-day-style revenue + profit grouped by order type (package/inquiry/service). */
export async function getProfitByService(range: DashboardRange): Promise<ProfitByServicePoint[]> {
  const from = sql`(${range.from}::date)`;
  const to = sql`(${range.to}::date)`;
  const rows = await withQueryTimeout(
    db
      .select({
        type: orders.type,
        revenue: sql<string>`coalesce(sum(${payments.amount}), 0)`,
        profit: sql<string>`coalesce(sum(${orders.grossProfit}), 0)`,
      })
      .from(orders)
      .leftJoin(
        payments,
        and(
          eq(payments.orderId, orders.id),
          eq(payments.status, "verified"),
          sql`${payments.updatedAt} >= ${from}::timestamp AND ${payments.updatedAt} < (${to}::date + 1)::timestamp`,
        ),
      )
      .where(sql`${orders.createdAt} >= ${from}::timestamp AND ${orders.createdAt} < (${to}::date + 1)::timestamp`)
      .groupBy(orders.type),
    DASHBOARD_QUERY_TIMEOUT_MS,
    "profit-by-service",
  );
  return rows.map((r) => ({
    type: r.type as string,
    revenue: Number(r.revenue ?? 0),
    profit: Number(r.profit ?? 0),
  }));
}

/** Most recent orders (any status) for the dashboard list. */
export async function getRecentOrders(limit = 8): Promise<
  { id: string; orderNo: string; status: string; total: number | null; createdAt: Date }[]
> {
  const rows = await withQueryTimeout(
    db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        status: orders.status,
        quotedPrice: orders.quotedPrice,
        finalPrice: orders.finalPrice,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(sql`${orders.createdAt} desc`)
      .limit(limit),
    DASHBOARD_QUERY_TIMEOUT_MS,
    "recent-orders",
  );
  return rows.map((r) => ({
    id: r.id,
    orderNo: r.orderNo,
    status: r.status as string,
    total: r.finalPrice !== null ? Number(r.finalPrice) : r.quotedPrice !== null ? Number(r.quotedPrice) : null,
    createdAt: r.createdAt,
  }));
}

/** Most recent submitted/verified payments for the dashboard list. */
export async function getRecentPayments(limit = 8): Promise<
  { id: string; orderId: string; amount: number; status: string; createdAt: Date }[]
> {
  const rows = await withQueryTimeout(
    db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .orderBy(sql`${payments.createdAt} desc`)
      .limit(limit),
    DASHBOARD_QUERY_TIMEOUT_MS,
    "recent-payments",
  );
  return rows.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    amount: Number(r.amount),
    status: r.status as string,
    createdAt: r.createdAt,
  }));
}

/**
 * Continuous daily series over the last `days` days (default 30, clamped to
 * [1, 365]): leads + orders created per day and revenue verified per day, with
 * every gap-free day included as a zero point so the frontend chart never
 * gaps. The series is anchored on the DATABASE's current_date and bucketed by
 * the database session timezone (choice 3 in the module header) — the day keys
 * the SQL returns and the day labels this function emits are therefore always
 * the same calendar.
 *
 * One parallel round: the current-date anchor + three grouped day histograms.
 */
// ---- trend -----------------------------------------------------------------------

export async function getDashboardTrend(opts: { days?: number } = {}): Promise<DashboardTrendPoint[]> {
  const days = clampDays(opts.days);
  const windowStart = sql`current_date - ${days - 1}::int`;

  const leadDay = sql`to_char(${leads.createdAt}, 'YYYY-MM-DD')`;
  const orderDay = sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`;
  const revenueDay = sql`to_char(${payments.updatedAt}, 'YYYY-MM-DD')`;

  const [todayRows, leadRows, orderRows, revenueRows] = await withQueryTimeout(
    Promise.all([
      db
        .execute(sql`select to_char(current_date, 'YYYY-MM-DD') as today`)
        .catch(() => [{ today: new Date().toISOString().slice(0, 10) }]) as unknown as Promise<{ today: string }[]>,
      db
        .select({ day: sql<string>`${leadDay}`, count: sql<number>`count(*)::int` })
        .from(leads)
        .where(sql`${leads.createdAt} >= ${windowStart}`)
        .groupBy(leadDay),
      db
        .select({ day: sql<string>`${orderDay}`, count: sql<number>`count(*)::int` })
        .from(orders)
        .where(sql`${orders.createdAt} >= ${windowStart}`)
        .groupBy(orderDay),
      db
        .select({ day: sql<string>`${revenueDay}`, total: sql<string>`sum(${payments.amount})` })
        .from(payments)
        .where(and(eq(payments.status, "verified"), sql`${payments.updatedAt} >= ${windowStart}`))
        .groupBy(revenueDay),
    ]),
    DASHBOARD_QUERY_TIMEOUT_MS,
    "dashboard-trend",
  );

  const today = todayRows[0]?.today ?? new Date().toISOString().slice(0, 10);
  const leadByDay = new Map(leadRows.map((row) => [row.day, row.count]));
  const orderByDay = new Map(orderRows.map((row) => [row.day, row.count]));
  const revenueByDay = new Map(revenueRows.map((row) => [row.day, row.total]));

  const points: DashboardTrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftIsoDay(today, -i);
    points.push({
      date,
      leads: leadByDay.get(date) ?? 0,
      orders: orderByDay.get(date) ?? 0,
      revenue: Number(revenueByDay.get(date) ?? 0),
    });
  }
  return points;
}
