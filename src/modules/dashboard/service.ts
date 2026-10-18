import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { withRetry } from "@/lib/with-retry";
import { withTimeout } from "@/lib/with-timeout";
// Cross-module-table reads follow the established convention (bookings reads
// catalog listings; expenses reads bookings orders + payments + catalog): the
// dashboard is an aggregate over every funnel table.
import type { OrderBoardCounts } from "@/modules/bookings/service";
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
 * never hang forever on pooler stalls or network drops; call sites wrap
 * their query thunk in withRetry() INSIDE this deadline so one transient
 * connection failure gets a fast retry without doubling the user's wait.
 * The pool bounds execution server-side (Supabase's 2-minute default is the
 * effective backstop through the transaction pooler — see the verified note
 * in db/connection.ts); this bounds the user's wait — a late-but-healthy
 * query surfaces as the dashboard's error card instead of a blank page
 * hanging for minutes, and the pool self-heals in the background.
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
 * Every headline figure for the dashboard, in ONE round trip: a single SELECT
 * whose scalar subqueries carry all ten aggregates (leads / payments /
 * expenses / orders FILTER counts + month sums), plus a jsonb status
 * histogram for the order board — instead of five parallel queries. On a
 * remote pooler every saved round trip is ~0.7s of page latency (see
 * db/connection.ts), and fewer concurrent requests also means fewer pool
 * waves. The order board keys are the orders.status enum values; unknown
 * keys are ignored and `total` sums exactly what the orders board counts.
 */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const rows = (await withQueryTimeout(
    withRetry(() =>
      db.execute(sql`
        select
          (select count(*)::int from ${leads}) as leads_total,
          (select (count(*) filter (where ${leads.status} = 'converted'))::int from ${leads}) as leads_converted,
          (select (count(*) filter (where ${leads.createdAt} >= current_date and ${leads.createdAt} < current_date + 1))::int from ${leads}) as leads_today,
          (select (count(*) filter (where ${leads.assignedTo} is null))::int from ${leads}) as leads_unassigned,
          (select (count(*) filter (where ${payments.status} = 'submitted'))::int from ${payments}) as payments_submitted,
          (select coalesce(sum(${payments.amount}) filter (
            where ${payments.status} = 'verified'
              and ${payments.updatedAt} >= date_trunc('month', current_date)
              and ${payments.updatedAt} < date_trunc('month', current_date) + interval '1 month'
          ), 0) from ${payments}) as revenue_this_month,
          (select (count(*) filter (where ${expenses.status} = 'pending'))::int from ${expenses}) as expenses_pending,
          (select coalesce(sum(${expenses.amount}) filter (
            where ${expenses.status} = 'approved' and ${expenses.date} >= date_trunc('month', current_date)::date
          ), 0) from ${expenses}) as expenses_this_month,
          (select coalesce(sum(${orders.costPrice}) filter (
            where ${orders.status} in ('confirmed', 'completed')
              and ${orders.updatedAt} >= date_trunc('month', current_date)
              and ${orders.updatedAt} < date_trunc('month', current_date) + interval '1 month'
          ), 0) from ${orders}) as cost_this_month,
          (select coalesce(jsonb_object_agg(t.status, t.n), '{}'::jsonb)
            from (select status, count(*)::int as n from ${orders} group by status) t
          ) as orders_by_status
      `),
    ),
    DASHBOARD_QUERY_TIMEOUT_MS,
    "kpis",
  )) as unknown as {
    leads_total: number;
    leads_converted: number;
    leads_today: number;
    leads_unassigned: number;
    payments_submitted: number;
    revenue_this_month: string;
    expenses_pending: number;
    expenses_this_month: string;
    cost_this_month: string;
    orders_by_status: Record<string, number> | null;
  }[];

  const row = rows[0];
  const leadsTotal = row?.leads_total ?? 0;
  const leadsConverted = row?.leads_converted ?? 0;
  const revenueThisMonth = Number(row?.revenue_this_month ?? 0);
  const costOfSalesThisMonth = Number(row?.cost_this_month ?? 0);
  const grossProfitThisMonth = Math.max(0, revenueThisMonth - costOfSalesThisMonth);
  const grossMarginPercent =
    revenueThisMonth > 0 ? Math.round((grossProfitThisMonth / revenueThisMonth) * 1000) / 10 : 0;
  const expensesThisMonth = Number(row?.expenses_this_month ?? 0);
  const netThisMonth = grossProfitThisMonth - expensesThisMonth;
  const netMarginPercent =
    revenueThisMonth > 0 ? Math.round((netThisMonth / revenueThisMonth) * 1000) / 10 : 0;

  const statusMap = row?.orders_by_status ?? {};
  const ordersByStatus: OrderBoardCounts = {
    pending: statusMap.pending ?? 0,
    confirmed: statusMap.confirmed ?? 0,
    cancelled: statusMap.cancelled ?? 0,
    completed: statusMap.completed ?? 0,
    total: Object.values(statusMap).reduce((sum, n) => sum + n, 0),
  };

  return {
    leadsToday: row?.leads_today ?? 0,
    leadsTotal,
    leadConversionRate:
      leadsTotal === 0 ? 0 : Math.round((leadsConverted / leadsTotal) * 1000) / 10,
    ordersByStatus,
    pendingPaymentsCount: row?.payments_submitted ?? 0,
    unassignedLeadsCount: row?.leads_unassigned ?? 0,
    revenueThisMonth,
    costOfSalesThisMonth,
    grossProfitThisMonth,
    grossMarginPercent,
    expensesThisMonth,
    netThisMonth,
    netMarginPercent,
    pendingExpensesCount: row?.expenses_pending ?? 0,
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
    withRetry(() =>
      db.execute(
        sql`select to_char(current_date, 'YYYY-MM-DD') as today,
          to_char(date_trunc('week', current_date)::date, 'YYYY-MM-DD') as week_start,
          to_char(date_trunc('month', current_date)::date, 'YYYY-MM-DD') as month_start`,
      ) as unknown as Promise<{ today: string; week_start: string; month_start: string }[]>,
    ),
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
 * Range KPIs in ONE round trip: a single SELECT whose scalar subqueries carry
 * all ten aggregates. Revenue = verified payments by updated day; cost =
 * costPrice of confirmed/completed orders by updated day; expenses = approved
 * by business date; leads created by day. pendingCollections is
 * range-independent (global outstanding).
 */
export async function getDashboardRangeKpis(range: DashboardRange): Promise<DashboardRangeKpis> {
  const rows = (await withQueryTimeout(
    withRetry(() =>
      db.execute(sql`
        select
          (select coalesce(sum(${payments.amount}) filter (
            where ${payments.status} = 'verified'
              and ${payments.updatedAt} >= ${range.from}::date
              and ${payments.updatedAt} < (${range.to}::date + 1)
          ), 0) from ${payments}) as revenue,
          (select (count(*) filter (where ${payments.status} = 'submitted'))::int from ${payments}) as payments_submitted,
          (select coalesce(sum(${orders.costPrice}) filter (
            where ${orders.status} in ('confirmed', 'completed')
              and ${orders.updatedAt} >= ${range.from}::date
              and ${orders.updatedAt} < (${range.to}::date + 1)
          ), 0) from ${orders}) as cost,
          (select coalesce(sum(coalesce(${orders.finalPrice}, ${orders.quotedPrice}, 0)) filter (
            where ${orders.status} in ('pending', 'confirmed')
          ), 0) from ${orders}) as open_total,
          (select coalesce(sum(${expenses.amount}) filter (
            where ${expenses.status} = 'approved'
              and ${expenses.date} >= ${range.from}::date
              and ${expenses.date} <= ${range.to}::date
          ), 0) from ${expenses}) as expenses_approved,
          (select (count(*) filter (where ${expenses.status} = 'pending'))::int from ${expenses}) as expenses_pending,
          (select (count(*) filter (
            where ${leads.createdAt} >= ${range.from}::date
              and ${leads.createdAt} < (${range.to}::date + 1)
          ))::int from ${leads}) as leads_total,
          (select (count(*) filter (
            where ${leads.createdAt} >= ${range.from}::date
              and ${leads.createdAt} < (${range.to}::date + 1)
              and ${leads.status} = 'converted'
          ))::int from ${leads}) as leads_converted,
          (select coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'verified'), 0) from ${payments}) as verified_paid_all,
          (select count(*)::int from ${leads}
            where ${leads.nextFollowUpAt} <= now() and ${leads.status} not in ('converted', 'lost')
          ) as follow_ups_due
      `),
    ),
    DASHBOARD_QUERY_TIMEOUT_MS,
    "range-kpis",
  )) as unknown as {
    revenue: string;
    payments_submitted: number;
    cost: string;
    open_total: string;
    expenses_approved: string;
    expenses_pending: number;
    leads_total: number;
    leads_converted: number;
    verified_paid_all: string;
    follow_ups_due: number;
  }[];

  const row = rows[0];
  const revenue = Number(row?.revenue ?? 0);
  const costOfSales = Number(row?.cost ?? 0);
  const grossProfit = Math.max(0, revenue - costOfSales);
  const grossMarginPercent =
    revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;
  const expensesTotal = Number(row?.expenses_approved ?? 0);
  const net = grossProfit - expensesTotal;
  const netMarginPercent = revenue > 0 ? Math.round((net / revenue) * 1000) / 10 : 0;
  const leadsTotal = row?.leads_total ?? 0;
  const openTotal = Number(row?.open_total ?? 0);
  const verifiedPaidAll = Number(row?.verified_paid_all ?? 0);

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
        : Math.round(((row?.leads_converted ?? 0) / leadsTotal) * 1000) / 10,
    pendingCollections: Math.max(0, openTotal - verifiedPaidAll),
    followUpsDue: row?.follow_ups_due ?? 0,
    pendingPaymentsCount: row?.payments_submitted ?? 0,
    pendingExpensesCount: row?.expenses_pending ?? 0,
  };
}

/** Lead funnel by stage (counts per status, board order). */
export async function getLeadFunnel(): Promise<LeadFunnelPoint[]> {
  const { getLeadBoardCounts } = await import("@/modules/leads/service");
  const { LEAD_STATUSES } = await import("@/modules/leads/validation");
  const counts = await withQueryTimeout(
    withRetry(() => getLeadBoardCounts()),
    DASHBOARD_QUERY_TIMEOUT_MS,
    "lead-funnel",
  );
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
    withRetry(() =>
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
    ),
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
    withRetry(() =>
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
    ),
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
    withRetry(() =>
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
    ),
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
 * ONE round trip: the date anchor + all three day-histograms as a UNION ALL
 * of grouped subselects (one numeric column `n` — counts and revenue both
 * land in it exactly; numeric sums come back as strings and are Number()ed
 * at this boundary like everywhere else in this module).
 */
// ---- trend -----------------------------------------------------------------------

export async function getDashboardTrend(opts: { days?: number } = {}): Promise<DashboardTrendPoint[]> {
  const days = clampDays(opts.days);
  const windowStart = sql`current_date - ${days - 1}::int`;

  const rows = (await withQueryTimeout(
    withRetry(() =>
      db.execute(sql`
        select 'anchor' as src, to_char(current_date, 'YYYY-MM-DD') as day, 0::numeric as n
        union all
        select 'leads' as src, day, n from (
          select to_char(${leads.createdAt}, 'YYYY-MM-DD') as day, count(*)::int as n
          from ${leads}
          where ${leads.createdAt} >= ${windowStart}
          group by 1
        ) s
        union all
        select 'orders' as src, day, n from (
          select to_char(${orders.createdAt}, 'YYYY-MM-DD') as day, count(*)::int as n
          from ${orders}
          where ${orders.createdAt} >= ${windowStart}
          group by 1
        ) s
        union all
        select 'revenue' as src, day, n from (
          select to_char(${payments.updatedAt}, 'YYYY-MM-DD') as day, coalesce(sum(${payments.amount}), 0) as n
          from ${payments}
          where ${payments.status} = 'verified' and ${payments.updatedAt} >= ${windowStart}
          group by 1
        ) s
      `),
    ),
    DASHBOARD_QUERY_TIMEOUT_MS,
    "dashboard-trend",
  )) as unknown as { src: string; day: string; n: string | number }[];

  const today =
    rows.find((row) => row.src === "anchor")?.day ?? new Date().toISOString().slice(0, 10);
  const leadByDay = new Map(
    rows.filter((row) => row.src === "leads").map((row) => [row.day, Number(row.n)]),
  );
  const orderByDay = new Map(
    rows.filter((row) => row.src === "orders").map((row) => [row.day, Number(row.n)]),
  );
  const revenueByDay = new Map(
    rows.filter((row) => row.src === "revenue").map((row) => [row.day, Number(row.n)]),
  );

  const points: DashboardTrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftIsoDay(today, -i);
    points.push({
      date,
      leads: leadByDay.get(date) ?? 0,
      orders: orderByDay.get(date) ?? 0,
      revenue: revenueByDay.get(date) ?? 0,
    });
  }
  return points;
}
