import type { Metadata, Route } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  DollarSign,
  LayoutDashboard,
  Receipt,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import { menuForRole } from "@/lib/admin-menu";
import SectionHeader from "@/components/admin/SectionHeader";
import {
  getDashboardKpis,
  getDashboardRangeKpis,
  getDashboardTrend,
  getLeadFunnel,
  getProfitByService,
  getRecentOrders,
  getRecentPayments,
  resolveDashboardRange,
  type DashboardPreset,
} from "@/modules/dashboard/service";
import type { OrderStatus } from "@/modules/bookings/validation";
import { ORDER_STATUSES } from "@/modules/bookings/validation";
import { formatMoney } from "@/components/site/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardTrendView from "./DashboardTrendView";
import DashboardRangeFilter from "./DashboardRangeFilter";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const instant = false;

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ORDER_STATUS_BADGE_VARIANTS: Record<
  OrderStatus,
  "secondary" | "info" | "default" | "warning" | "success" | "destructive"
> = {
  pending: "secondary",
  confirmed: "success",
  completed: "default",
  cancelled: "destructive",
};

/** Colored left rail per order status on the status tiles. */
const ORDER_STATUS_ACCENTS: Record<OrderStatus, string> = {
  pending: "var(--c-amber)",
  confirmed: "var(--c-blue)",
  completed: "var(--c-green)",
  cancelled: "var(--c-red)",
};

/** Per-row accent cycle for ranked lists (artifact's 6-colour rotation). */
const ACCENTS = [
  "var(--c-blue)",
  "var(--c-violet)",
  "var(--c-cyan)",
  "var(--c-green)",
  "var(--c-amber)",
  "var(--c-pink)",
] as const;

/** Stage-coded funnel accents (artifact palette, semantic order). */
const FUNNEL_ACCENTS: Record<string, string> = {
  new: "var(--c-blue)",
  contacted: "var(--c-violet)",
  qualified: "var(--c-cyan)",
  negotiating: "var(--c-amber)",
  converted: "var(--c-green)",
  lost: "var(--c-red)",
};

export default async function AdminDashboardPage(props: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const sp = await props.searchParams;
  const preset: DashboardPreset =
    sp.preset === "today" || sp.preset === "week" || sp.preset === "custom" ? sp.preset : "month";

  let session: Awaited<ReturnType<typeof requireSession>> | undefined;
  let range: Awaited<ReturnType<typeof resolveDashboardRange>> | undefined;
  let kpis: Awaited<ReturnType<typeof getDashboardKpis>> | undefined;
  let rangeKpis: Awaited<ReturnType<typeof getDashboardRangeKpis>> | undefined;
  let trend: Awaited<ReturnType<typeof getDashboardTrend>> | undefined;
  let funnel: Awaited<ReturnType<typeof getLeadFunnel>> | undefined;
  let profitByService: Awaited<ReturnType<typeof getProfitByService>> | undefined;
  let recentOrders: Awaited<ReturnType<typeof getRecentOrders>> | undefined;
  let recentPayments: Awaited<ReturnType<typeof getRecentPayments>> | undefined;
  let loadError: string | null = null;

  try {
    session = await requireSession();
    range = await resolveDashboardRange({ preset, from: sp.from, to: sp.to });
    [kpis, rangeKpis, trend, funnel, profitByService, recentOrders, recentPayments] =
      await Promise.all([
        getDashboardKpis(),
        getDashboardRangeKpis(range),
        getDashboardTrend({ days: 30 }),
        getLeadFunnel(),
        getProfitByService(range),
        getRecentOrders(),
        getRecentPayments(),
      ]);
  } catch (err: unknown) {
    console.error("[AdminDashboardPage] Failed to load dashboard data:", err);
    loadError = err instanceof Error ? err.message : "Failed to connect to database";
  }

  if (
    loadError ||
    !session ||
    !range ||
    !kpis ||
    !rangeKpis ||
    !trend ||
    !funnel ||
    !profitByService ||
    !recentOrders ||
    !recentPayments
  ) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              Overview of inquiries, orders, payments, expenses, and operational queues.
            </p>
          </div>
        </div>

        <Card className="border-destructive/40 bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">
                  Unable to load dashboard data
                </h2>
                <p className="text-xs text-muted-foreground">
                  {loadError ?? "The database service is unreachable or query timed out."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={"/admin" as Route}>
                <Button size="sm" className="h-9 text-xs gap-1.5">
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Retry
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const sections = menuForRole(session.user.role).length;
  void sections;

  /* Artifact header sub-line: "1 Oct – 16 Oct · Monday, 19 October 2026". */
  const fmtDay = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const rangeLabel = `${fmtDay(range.from)} – ${fmtDay(range.to)} · ${todayLabel}`;

  return (
    <div className="dash-rise space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader
          title="Dashboard"
          description={rangeLabel}
          icon={LayoutDashboard}
          accent="var(--c-blue)"
        />
        <DashboardRangeFilter preset={range.preset} from={range.from} to={range.to} />
      </div>

      {/* KPI Cards Row — artifact tint language: gradient wash, icon chip and
          value all derive from per-card --k; hover lifts with tinted border. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card
          className="kpi-card shadow-xs border-border bg-card"
          style={{ "--k": "var(--c-green)" } as CSSProperties}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
              <span>Revenue</span>
              <span className="kpi-chip">
                <DollarSign aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p
              className="kpi-value truncate font-mono text-2xl font-bold tracking-tight tabular-nums"
              data-money
            >
              {formatMoney(rangeKpis.revenue, "BDT")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Verified · {rangeKpis.days}-day range
            </p>
          </CardContent>
        </Card>

        {/* Cost of Sales (COGS) */}
        <Card
          className="kpi-card shadow-xs border-border bg-card"
          style={{ "--k": "var(--c-orange)" } as CSSProperties}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
              <span>Cost of Sales</span>
              <span className="kpi-chip">
                <Receipt aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p
              className="kpi-value truncate font-mono text-2xl font-bold tracking-tight tabular-nums"
              data-money
            >
              {formatMoney(rangeKpis.costOfSales, "BDT")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Direct orders cost
            </p>
          </CardContent>
        </Card>

        {/* Gross Profit */}
        <Card
          className="kpi-card shadow-xs border-border bg-card"
          style={{ "--k": "var(--c-cyan)" } as CSSProperties}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
              <span>Gross Profit</span>
              <span className="kpi-chip">
                <TrendingUp aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p
              className="kpi-value truncate font-mono text-2xl font-bold tracking-tight tabular-nums"
              data-money
            >
              {formatMoney(rangeKpis.grossProfit, "BDT")}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Margin:</span>
              <span className="font-semibold text-foreground">{rangeKpis.grossMarginPercent}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Operating Expenses */}
        <Card
          className="kpi-card shadow-xs border-border bg-card"
          style={{ "--k": "var(--c-amber)" } as CSSProperties}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
              <span>Op. Expenses</span>
              <span className="kpi-chip">
                <Receipt aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p
              className="kpi-value truncate font-mono text-2xl font-bold tracking-tight tabular-nums"
              data-money
            >
              {formatMoney(rangeKpis.expenses, "BDT")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Approved in range
            </p>
          </CardContent>
        </Card>

        {/* Net Profit / Loss */}
        <Card
          className="kpi-card shadow-xs border-border bg-card"
          style={
            { "--k": rangeKpis.net >= 0 ? "var(--c-green)" : "var(--c-red)" } as CSSProperties
          }
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
              <span>Net Profit</span>
              <span className="kpi-chip">
                {rangeKpis.net >= 0 ? (
                  <ArrowUpRight aria-hidden="true" />
                ) : (
                  <ArrowDownRight aria-hidden="true" />
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p
              className="kpi-value truncate font-mono text-2xl font-bold tracking-tight tabular-nums"
              data-money
            >
              {formatMoney(rangeKpis.net, "BDT")}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <Badge
                variant={rangeKpis.net >= 0 ? "success" : "destructive"}
                className="text-[10px] px-1 py-0"
              >
                {rangeKpis.net >= 0 ? "Profitable" : "Deficit"}
              </Badge>
              <span className="text-muted-foreground font-mono">{rangeKpis.netMarginPercent}% net</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Collections */}
        <Card
          className="kpi-card shadow-xs border-border bg-card"
          style={{ "--k": "var(--c-red)" } as CSSProperties}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
              <span>Pending Collections</span>
              <span className="kpi-chip">
                <Banknote aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p
              className="kpi-value truncate font-mono text-2xl font-bold tracking-tight tabular-nums"
              data-money
            >
              {formatMoney(rangeKpis.pendingCollections, "BDT")}
            </p>
            <Link
              href={"/admin/payments" as Route}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <span>{rangeKpis.pendingPaymentsCount} awaiting verification</span>
              <ArrowRight className="size-2.5" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        {/* Leads / conversion in range */}
        <Card
          className="kpi-card shadow-xs border-border bg-card"
          style={{ "--k": "var(--c-blue)" } as CSSProperties}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
              <span>Leads</span>
              <span className="kpi-chip">
                <Users aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="kpi-value font-mono text-2xl font-bold tracking-tight">
              {rangeKpis.leads}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>In selected range</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 font-mono">
                {rangeKpis.leadConversionRate}% conv
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Follow-ups due */}
        <Card
          className="kpi-card shadow-xs border-border bg-card"
          style={{ "--k": "var(--c-blue)" } as CSSProperties}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
              <span>Follow-ups Due</span>
              <span className="kpi-chip">
                <Users aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="kpi-value font-mono text-2xl font-bold tracking-tight">
              {rangeKpis.followUpsDue}
            </p>
            <Link
              href={"/admin/leads" as Route}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <span>Overdue or due now</span>
              <ArrowRight className="size-2.5" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Status Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Orders by Status
          </h2>
          <Link
            href={"/admin/orders" as Route}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>View board</span>
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {ORDER_STATUSES.map((status) => {
            const count = kpis.ordersByStatus[status] ?? 0;
            return (
              <Link
                key={status}
                href={"/admin/orders" as Route}
                style={{ "--k": ORDER_STATUS_ACCENTS[status] } as CSSProperties}
                className="group row-accent lift flex min-h-[44px] items-center justify-between rounded-lg border border-border bg-card p-3 pl-2.5 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={ORDER_STATUS_BADGE_VARIANTS[status]}
                    className="size-2 rounded-full p-0"
                  />
                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                    {ORDER_STATUS_LABELS[status]}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-foreground bg-secondary/50 px-1.5 py-0.5 rounded-sm">
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Queues Section — compact artifact tiles; the whole card is the link */}
      <div className="grid gap-3 md:grid-cols-3">
        <Link
          href={"/admin/payments" as Route}
          className="queue-card"
          style={{ "--k": "var(--c-amber)" } as CSSProperties}
        >
          <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground">Payment verification</p>
            <p className="kpi-value mt-0.5 font-mono text-2xl font-bold tracking-tight tabular-nums">
              {kpis.pendingPaymentsCount}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {kpis.pendingPaymentsCount === 0
                ? "Queue clear — all verified"
                : `${kpis.pendingPaymentsCount} receipt${kpis.pendingPaymentsCount === 1 ? "" : "s"} awaiting review`}
            </p>
          </div>
          <Badge
            variant={kpis.pendingPaymentsCount > 0 ? "warning" : "secondary"}
            className="shrink-0 font-mono text-xs"
          >
            {kpis.pendingPaymentsCount > 0 ? "Needs action" : "All clear"}
          </Badge>
        </Link>

        <Link
          href={"/admin/expenses" as Route}
          className="queue-card"
          style={{ "--k": "var(--c-violet)" } as CSSProperties}
        >
          <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground">Expense approval</p>
            <p className="kpi-value mt-0.5 font-mono text-2xl font-bold tracking-tight tabular-nums">
              {kpis.pendingExpensesCount}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {kpis.pendingExpensesCount === 0
                ? "Queue clear — all approved"
                : `${kpis.pendingExpensesCount} claim${kpis.pendingExpensesCount === 1 ? "" : "s"} awaiting approval`}
            </p>
          </div>
          <Badge
            variant={kpis.pendingExpensesCount > 0 ? "warning" : "secondary"}
            className="shrink-0 font-mono text-xs"
          >
            {kpis.pendingExpensesCount > 0 ? "Needs action" : "All clear"}
          </Badge>
        </Link>

        <Link
          href={"/admin/leads" as Route}
          className="queue-card"
          style={{ "--k": "var(--c-blue)" } as CSSProperties}
        >
          <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground">Follow-ups due</p>
            <p className="kpi-value mt-0.5 font-mono text-2xl font-bold tracking-tight tabular-nums">
              {rangeKpis.followUpsDue}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {rangeKpis.followUpsDue === 0
                ? "Nothing overdue"
                : `${rangeKpis.followUpsDue} lead${rangeKpis.followUpsDue === 1 ? "" : "s"} past the follow-up date`}
            </p>
          </div>
          <Badge
            variant={rangeKpis.followUpsDue > 0 ? "warning" : "secondary"}
            className="shrink-0 font-mono text-xs"
          >
            {rangeKpis.followUpsDue > 0 ? "Needs action" : "All clear"}
          </Badge>
        </Link>
      </div>

      {/* Funnel + Profit by service — artifact .tr bar rows */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle
              className="dot-k flex items-center gap-2 text-sm font-semibold"
              style={{ "--k": "var(--c-blue)" } as CSSProperties}
            >
              Lead funnel by stage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2.5">
            {funnel.map((point, i) => {
              const max = Math.max(1, ...funnel.map((p) => p.count));
              return (
                <div
                  key={point.status}
                  className="space-y-1.5"
                  style={
                    {
                      "--k": FUNNEL_ACCENTS[point.status] ?? ACCENTS[i % ACCENTS.length],
                    } as CSSProperties
                  }
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs capitalize text-muted-foreground">
                      {point.status.replace("_", " ")}
                    </span>
                    <span className="font-mono text-xs font-bold">{point.count}</span>
                  </div>
                  <div className="h-2 min-h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="funnel-fill bar-grow h-full rounded-full"
                      style={{ width: `${Math.round((point.count / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle
              className="dot-k flex items-center gap-2 text-sm font-semibold"
              style={{ "--k": "var(--c-violet)" } as CSSProperties}
            >
              Profit by service
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-3">
            {profitByService.length === 0 ? (
              <p className="text-xs text-muted-foreground">No orders in this range yet.</p>
            ) : (
              profitByService.map((point, i) => {
                const maxProfit = Math.max(
                  1,
                  ...profitByService.map((p) => Math.abs(p.profit)),
                );
                const width = Math.max(
                  3,
                  Math.round((Math.abs(point.profit) / maxProfit) * 100),
                );
                return (
                  <div key={point.type} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-xs font-medium capitalize">
                        {point.type}
                        <span className="ml-1.5 text-[10.5px] font-normal text-muted-foreground">
                          rev {formatMoney(point.revenue, "BDT")}
                        </span>
                      </span>
                      <span className="font-mono text-xs font-bold tabular-nums" data-money>
                        {formatMoney(point.profit, "BDT")}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="funnel-fill bar-grow h-full rounded-full"
                        style={
                          {
                            "--k": ACCENTS[i % ACCENTS.length],
                            width: `${width}%`,
                          } as CSSProperties
                        }
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders + payments */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle
                className="dot-k flex items-center gap-2 text-sm font-semibold"
                style={{ "--k": "var(--c-green)" } as CSSProperties}
              >
                Recent orders
              </CardTitle>
              <Link href={"/admin/orders" as Route} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                View all <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {recentOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No orders yet.</p>
            ) : (
              <ul>
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/orders/${order.id}` as Route}
                      className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-secondary/40"
                    >
                      <span className="font-mono text-xs font-bold">{order.orderNo}</span>
                      <Badge variant={ORDER_STATUS_BADGE_VARIANTS[order.status as OrderStatus]} className="text-[10px] capitalize">
                        {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                      </Badge>
                      <span className="font-mono text-xs tabular-nums" data-money>
                        {order.total !== null ? formatMoney(order.total, "BDT") : "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle
                className="dot-k flex items-center gap-2 text-sm font-semibold"
                style={{ "--k": "var(--c-cyan)" } as CSSProperties}
              >
                Recent payments
              </CardTitle>
              <Link href={"/admin/payments" as Route} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                Open queue <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {recentPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No payments yet.</p>
            ) : (
              <ul>
                {recentPayments.map((payment) => (
                  <li key={payment.id}>
                    <Link
                      href={"/admin/payments" as Route}
                      className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-secondary/40"
                    >
                      <span className="font-mono text-xs">{payment.orderId.slice(0, 8)}…</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{payment.status}</Badge>
                      <span className="font-mono text-xs font-bold tabular-nums" data-money>
                        {formatMoney(payment.amount, "BDT")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 30-Day Trend Chart */}
      <DashboardTrendView trend={trend} />
    </div>
  );
}
