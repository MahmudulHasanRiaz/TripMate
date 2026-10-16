import { describe, expect, it, vi } from "vitest";
import "dotenv/config";

// DB-backed integration suite for the dashboard service (KPI aggregates +
// trend series). The drizzle client connects against process.env.DATABASE_URL
// at module load, and local `vitest run` may have no database, so this suite
// is OFF by default — Plan 7 CI flips it on with RUN_DB_INTEGRATION=1. It is
// READ-ONLY (every query is a count/sum; nothing writes).

// service.ts imports "server-only" (it throws outside a React Server runtime);
// stub the marker so the suite actually runs under vitest's node env — the
// same pattern as the bookings/payments/expenses integration suites.
vi.mock("server-only", () => ({}));

const integration = process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!integration)("dashboard service (integration — Postgres)", () => {
  it("getDashboardKpis returns the full KPI contract with sane value types", async () => {
    const { getDashboardKpis } = await import("@/modules/dashboard/service");
    const kpis = await getDashboardKpis();

    expect(Object.keys(kpis).sort()).toEqual(
      [
        "costOfSalesThisMonth",
        "expensesThisMonth",
        "grossMarginPercent",
        "grossProfitThisMonth",
        "leadConversionRate",
        "leadsToday",
        "leadsTotal",
        "netMarginPercent",
        "netThisMonth",
        "ordersByStatus",
        "pendingExpensesCount",
        "pendingPaymentsCount",
        "revenueThisMonth",
        "unassignedLeadsCount",
      ].sort(),
    );

    for (const key of [
      "leadsToday",
      "leadsTotal",
      "pendingPaymentsCount",
      "unassignedLeadsCount",
      "pendingExpensesCount",
    ] as const) {
      expect(Number.isInteger(kpis[key])).toBe(true);
      expect(kpis[key]).toBeGreaterThanOrEqual(0);
    }
    for (const key of [
      "revenueThisMonth",
      "costOfSalesThisMonth",
      "grossProfitThisMonth",
      "expensesThisMonth",
    ] as const) {
      expect(Number.isFinite(kpis[key])).toBe(true);
      expect(kpis[key]).toBeGreaterThanOrEqual(0);
    }
    // netThisMonth can be negative (a net loss when expenses exceed gross profit).
    expect(Number.isFinite(kpis.netThisMonth)).toBe(true);
    expect(kpis.leadConversionRate).toBeGreaterThanOrEqual(0);
    expect(kpis.leadConversionRate).toBeLessThanOrEqual(100);
  });

  it("KPI lead figures agree with the leads board counts (same tables, same SQL)", async () => {
    const { getDashboardKpis } = await import("@/modules/dashboard/service");
    const { getLeadBoardCounts } = await import("@/modules/leads/service");

    const [kpis, board] = await Promise.all([getDashboardKpis(), getLeadBoardCounts()]);
    expect(kpis.leadsTotal).toBe(board.total);
    const expectedRate =
      board.total === 0
        ? 0
        : Math.round((board.converted / board.total) * 1000) / 10;
    expect(kpis.leadConversionRate).toBe(expectedRate);
    expect(kpis.unassignedLeadsCount).toBeLessThanOrEqual(board.total);
  });

  it("KPI ordersByStatus is the bookings board shape (reuse, not a re-derivation)", async () => {
    const { getDashboardKpis } = await import("@/modules/dashboard/service");
    const { getOrderBoardCounts } = await import("@/modules/bookings/service");

    const [kpis, board] = await Promise.all([getDashboardKpis(), getOrderBoardCounts()]);
    expect(kpis.ordersByStatus).toEqual(board);
    expect(Object.keys(kpis.ordersByStatus).sort()).toEqual(
      ["cancelled", "completed", "confirmed", "pending", "total"].sort(),
    );
  });

  it("KPI month figures agree with the expenses P&L report for the current month", async () => {
    const { getDashboardKpis, getDashboardTrend } = await import("@/modules/dashboard/service");
    const { getPLReport } = await import("@/modules/expenses/service");

    // Anchor the month bounds on the DATABASE's current_date (the trend's last
    // point IS that date) so the P&L window always describes the same "current
    // month" the KPI's date_trunc sees, whatever the session timezone is.
    const [kpis, trend] = await Promise.all([
      getDashboardKpis(),
      getDashboardTrend({ days: 1 }),
    ]);
    const today = trend[trend.length - 1].date;
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = new Date(`${monthStart}T00:00:00Z`);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    monthEnd.setUTCDate(0); // last calendar day of the month, UTC-exact

    const pl = await getPLReport({
      from: monthStart,
      to: monthEnd.toISOString().slice(0, 10),
    });
    expect(kpis.revenueThisMonth).toBe(pl.revenue);
    expect(kpis.expensesThisMonth).toBe(pl.expenseTotal);
    expect(kpis.netThisMonth).toBe(pl.revenue - pl.expenseTotal);
  });

  it("getDashboardTrend returns a continuous, zero-filled, ascending daily series", async () => {
    const { getDashboardTrend } = await import("@/modules/dashboard/service");
    const trend = await getDashboardTrend({ days: 30 });

    expect(trend).toHaveLength(30);
    const isoDay = /^\d{4}-\d{2}-\d{2}$/;
    for (let i = 0; i < trend.length; i++) {
      expect(trend[i].date).toMatch(isoDay);
      expect(Number.isInteger(trend[i].leads)).toBe(true);
      expect(Number.isInteger(trend[i].orders)).toBe(true);
      expect(Number.isFinite(trend[i].revenue)).toBe(true);
      if (i > 0) {
        const gap =
          new Date(`${trend[i].date}T00:00:00Z`).getTime() -
          new Date(`${trend[i - 1].date}T00:00:00Z`).getTime();
        expect(gap).toBe(86_400_000); // strictly consecutive days — no chart gaps
      }
    }
  });

  it("getDashboardTrend clamps its window (days=1 → one point; absent/NaN → 30-day default)", async () => {
    const { getDashboardTrend } = await import("@/modules/dashboard/service");

    const one = await getDashboardTrend({ days: 1 });
    expect(one).toHaveLength(1);

    const zero = await getDashboardTrend({ days: 0 });
    expect(zero).toHaveLength(1); // clamped up to 1, not the default

    const defaulted = await getDashboardTrend({});
    expect(defaulted).toHaveLength(30);

    const nan = await getDashboardTrend({ days: Number.NaN });
    expect(nan).toHaveLength(30);
  });

  it("getDashboardTrend point totals agree with direct table counts over the window", async () => {
    const { getDashboardTrend } = await import("@/modules/dashboard/service");
    const { getLeadBoardCounts } = await import("@/modules/leads/service");

    // A wide window (365d, the clamp ceiling) covers every seeded row, so the
    // series' lead total must equal the board total.
    const [trend, board] = await Promise.all([
      getDashboardTrend({ days: 365 }),
      getLeadBoardCounts(),
    ]);
    const trendLeads = trend.reduce((sum, p) => sum + p.leads, 0);
    expect(trendLeads).toBeGreaterThanOrEqual(board.total);
  });
});
