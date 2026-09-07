import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
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
  /** Sum of APPROVED expenses whose business date falls in the current month. */
  expensesThisMonth: number;
  /** revenueThisMonth - expensesThisMonth. */
  netThisMonth: number;
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
  const [leadRows, paymentRows, expenseRows, ordersByStatus] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        converted: sql<number>`(count(*) filter (where ${leads.status} = 'converted'))::int`,
        today: sql<number>`(count(*) filter (where date(${leads.createdAt}) = current_date))::int`,
        unassigned: sql<number>`(count(*) filter (where ${leads.assignedTo} is null))::int`,
      })
      .from(leads),
    db
      .select({
        submitted: sql<number>`(count(*) filter (where ${payments.status} = 'submitted'))::int`,
        revenueThisMonth: sql<string>`coalesce(
          (sum(${payments.amount}) filter (
            where ${payments.status} = 'verified'
              and date_trunc('month', ${payments.updatedAt}) = date_trunc('month', current_date)
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
    getOrderBoardCounts(),
  ]);

  const leadsTotal = leadRows[0]?.total ?? 0;
  const leadsConverted = leadRows[0]?.converted ?? 0;
  const revenueThisMonth = Number(paymentRows[0]?.revenueThisMonth ?? 0);
  const expensesThisMonth = Number(expenseRows[0]?.approvedThisMonth ?? 0);

  return {
    leadsToday: leadRows[0]?.today ?? 0,
    leadsTotal,
    leadConversionRate:
      leadsTotal === 0 ? 0 : Math.round((leadsConverted / leadsTotal) * 1000) / 10,
    ordersByStatus,
    pendingPaymentsCount: paymentRows[0]?.submitted ?? 0,
    unassignedLeadsCount: leadRows[0]?.unassigned ?? 0,
    revenueThisMonth,
    expensesThisMonth,
    netThisMonth: revenueThisMonth - expensesThisMonth,
    pendingExpensesCount: expenseRows[0]?.pending ?? 0,
  };
}

// ---- trend -----------------------------------------------------------------------

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
export async function getDashboardTrend(opts: { days?: number } = {}): Promise<DashboardTrendPoint[]> {
  const days = clampDays(opts.days);
  // `current_date - N` (date minus integer days) bounds each histogram to the
  // window; the bound is expressed in SQL so no Node-side clock reading can
  // disagree with the bucketing timezone.
  const windowStart = sql`current_date - ${days - 1}::int`;

  const leadDay = sql`to_char(date(${leads.createdAt}), 'YYYY-MM-DD')`;
  const orderDay = sql`to_char(date(${orders.createdAt}), 'YYYY-MM-DD')`;
  const revenueDay = sql`to_char(date(${payments.updatedAt}), 'YYYY-MM-DD')`;

  const [todayRows, leadRows, orderRows, revenueRows] = await Promise.all([
    // drizzle's builder has no select-without-from form, so the date anchor is
    // a one-row raw SELECT. postgres-js resolves execute() to the rows array —
    // cast through unknown once, here, rather than loosening types everywhere.
    db.execute(
      sql`select to_char(current_date, 'YYYY-MM-DD') as today`,
    ) as unknown as Promise<{ today: string }[]>,
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
  ]);

  // Only days WITH activity come back from the GROUP BYs; the JS pass stitches
  // them onto the full continuous day list (zero-filled).
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
