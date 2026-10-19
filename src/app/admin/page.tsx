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
import { cn } from "@/lib/utils";
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

/** Per-row accent cycle for ranked lists (funnel stages, profit rows). */
const ACCENTS = [
  "var(--c-green)",
  "var(--c-blue)",
  "var(--c-amber)",
  "var(--c-violet)",
  "var(--c-cyan)",
  "var(--c-pink)",
  "var(--c-orange)",
  "var(--c-red)",
] as const;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader
          title="Dashboard"
          description="Overview of inquiries, orders, payments, expenses, and operational queues."
          icon={LayoutDashboard}
          accent="var(--c-blue)"
        />
        <DashboardRangeFilter preset={range.preset} from={range.from} to={range.to} />
      </div>

      {/* KPI Cards Row (Responsive financial & operational grid) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Leads / conversion in range */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Leads</span>
              <span className="kpi-chip" style={{ "--k": "var(--c-blue)" } as CSSProperties}>
                <Users aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
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

        {/* Pending Collections */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Pending Collections</span>
              <span className="kpi-chip" style={{ "--k": "var(--c-amber)" } as CSSProperties}>
                <Banknote aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-xl font-bold tracking-tight text-foreground truncate tabular-nums" data-money>
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

        {/* Total Revenue */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Revenue</span>
              <span className="kpi-chip" style={{ "--k": "var(--c-green)" } as CSSProperties}>
                <DollarSign aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-xl font-bold tracking-tight text-foreground truncate tabular-nums" data-money>
              {formatMoney(rangeKpis.revenue, "BDT")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Verified · {rangeKpis.days}-day range
            </p>
          </CardContent>
        </Card>

        {/* Cost of Sales (COGS) */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Cost of Sales</span>
              <span className="kpi-chip" style={{ "--k": "var(--c-orange)" } as CSSProperties}>
                <Receipt aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-xl font-bold tracking-tight text-foreground truncate tabular-nums" data-money>
              {formatMoney(rangeKpis.costOfSales, "BDT")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Direct orders cost
            </p>
          </CardContent>
        </Card>

        {/* Gross Profit */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Gross Profit</span>
              <span className="kpi-chip" style={{ "--k": "var(--c-green)" } as CSSProperties}>
                <TrendingUp aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-xl font-bold tracking-tight text-success truncate tabular-nums" data-money>
              {formatMoney(rangeKpis.grossProfit, "BDT")}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Margin:</span>
              <span className="font-semibold text-foreground">{rangeKpis.grossMarginPercent}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Operating Expenses */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Op. Expenses</span>
              <span className="kpi-chip" style={{ "--k": "var(--c-red)" } as CSSProperties}>
                <Receipt aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-xl font-bold tracking-tight text-foreground truncate tabular-nums" data-money>
              {formatMoney(rangeKpis.expenses, "BDT")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Approved in range
            </p>
          </CardContent>
        </Card>

        {/* Net Profit / Loss */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Net Profit</span>
              <span
                className="kpi-chip"
                style={
                  { "--k": rangeKpis.net >= 0 ? "var(--c-green)" : "var(--c-red)" } as CSSProperties
                }
              >
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
              className={cn(
                "font-mono text-xl font-bold tracking-tight truncate tabular-nums",
                rangeKpis.net >= 0 ? "text-success" : "text-destructive",
              )}
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

        {/* Follow-ups due */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Follow-ups Due</span>
              <span className="kpi-chip" style={{ "--k": "var(--c-violet)" } as CSSProperties}>
                <Users aria-hidden="true" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
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
                className="group row-accent flex items-center justify-between rounded-lg border border-border bg-card p-3 pl-2.5 shadow-xs hover:bg-secondary/20 transition-all min-h-[44px]"
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

      {/* Queues Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Payment Verification Queue */}
        <Card
          className="stat-glow shadow-xs border-border bg-card"
          style={{ "--k": "var(--c-amber)" } as CSSProperties}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="kpi-chip" style={{ "--k": "var(--c-amber)" } as CSSProperties}>
                  <Banknote aria-hidden="true" />
                </span>
                <span>Payment Verification Queue</span>
              </CardTitle>
              <Badge
                variant={kpis.pendingPaymentsCount > 0 ? "warning" : "secondary"}
                className="font-mono text-xs"
              >
                {kpis.pendingPaymentsCount} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-3">
            <p className="text-xs text-muted-foreground">
              Customer bank transfer receipts and transaction IDs awaiting review and verification before order confirmation.
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground font-mono">
                {kpis.pendingPaymentsCount === 0
                  ? "Queue clear — all verified"
                  : `${kpis.pendingPaymentsCount} item${kpis.pendingPaymentsCount === 1 ? "" : "s"} in queue`}
              </span>
              <Button asChild size="sm" variant="outline" className="min-h-[44px] text-xs">
                <Link href={"/admin/payments" as Route}>
                  Open queue
                  <ArrowRight className="size-3.5 ml-1.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Expense Approval Queue */}
        <Card
          className="stat-glow shadow-xs border-border bg-card"
          style={{ "--k": "var(--c-violet)" } as CSSProperties}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="kpi-chip" style={{ "--k": "var(--c-red)" } as CSSProperties}>
                  <Receipt aria-hidden="true" />
                </span>
                <span>Expense Approval Queue</span>
              </CardTitle>
              <Badge
                variant={kpis.pendingExpensesCount > 0 ? "warning" : "secondary"}
                className="font-mono text-xs"
              >
                {kpis.pendingExpensesCount} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-3">
            <p className="text-xs text-muted-foreground">
              Operational expenses and direct order fulfilment costs submitted by staff awaiting manager approval.
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground font-mono">
                {kpis.pendingExpensesCount === 0
                  ? "Queue clear — all approved"
                  : `${kpis.pendingExpensesCount} item${kpis.pendingExpensesCount === 1 ? "" : "s"} in queue`}
              </span>
              <Button asChild size="sm" variant="outline" className="min-h-[44px] text-xs">
                <Link href={"/admin/expenses" as Route}>
                  Open queue
                  <ArrowRight className="size-3.5 ml-1.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Follow-ups Due Queue */}
        <Card
          className="stat-glow shadow-xs border-border bg-card"
          style={{ "--k": "var(--c-blue)" } as CSSProperties}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="kpi-chip" style={{ "--k": "var(--c-blue)" } as CSSProperties}>
                  <Users aria-hidden="true" />
                </span>
                <span>Follow-ups Due</span>
              </CardTitle>
              <Badge
                variant={rangeKpis.followUpsDue > 0 ? "warning" : "secondary"}
                className="font-mono text-xs"
              >
                {rangeKpis.followUpsDue} due
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-3">
            <p className="text-xs text-muted-foreground">
              Leads whose next follow-up date has passed and are not converted or lost.
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground font-mono">
                {rangeKpis.followUpsDue === 0
                  ? "Nothing overdue"
                  : `${rangeKpis.followUpsDue} lead${rangeKpis.followUpsDue === 1 ? "" : "s"} waiting`}
              </span>
              <Button asChild size="sm" variant="outline" className="min-h-10 text-xs">
                <Link href={"/admin/leads" as Route}>
                  Open leads
                  <ArrowRight className="size-3.5 ml-1.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel + Profit by service */}
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
          <CardContent className="p-4 pt-1 space-y-2">
            {funnel.map((point, i) => {
              const max = Math.max(1, ...funnel.map((p) => p.count));
              return (
                <div
                  key={point.status}
                  className="flex items-center gap-3"
                  style={{ "--k": ACCENTS[i % ACCENTS.length] } as CSSProperties}
                >
                  <span className="w-24 shrink-0 text-xs capitalize text-muted-foreground">
                    {point.status.replace("_", " ")}
                  </span>
                  <div className="h-2 min-h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="funnel-fill h-full rounded-full"
                      style={{ width: `${Math.round((point.count / max) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-mono text-xs font-bold">{point.count}</span>
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
          <CardContent className="p-4 pt-1 space-y-2">
            {profitByService.length === 0 ? (
              <p className="text-xs text-muted-foreground">No orders in this range yet.</p>
            ) : (
              profitByService.map((point, i) => (
                <div
                  key={point.type}
                  className="row-accent flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  style={{ "--k": ACCENTS[i % ACCENTS.length] } as CSSProperties}
                >
                  <span className="text-xs font-medium capitalize">{point.type}</span>
                  <span className="text-right font-mono text-xs tabular-nums" data-money>
                    {formatMoney(point.revenue, "BDT")}
                    <span className="ml-2 text-muted-foreground">
                      profit {formatMoney(point.profit, "BDT")}
                    </span>
                  </span>
                </div>
              ))
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
              <ul className="divide-y divide-border/60">
                {recentOrders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/admin/orders/${order.id}` as Route} className="font-mono text-xs font-bold hover:text-primary">
                      {order.orderNo}
                    </Link>
                    <Badge variant={ORDER_STATUS_BADGE_VARIANTS[order.status as OrderStatus]} className="text-[10px] capitalize">
                      {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                    </Badge>
                    <span className="font-mono text-xs tabular-nums" data-money>
                      {order.total !== null ? formatMoney(order.total, "BDT") : "—"}
                    </span>
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
              <ul className="divide-y divide-border/60">
                {recentPayments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={"/admin/payments" as Route} className="font-mono text-xs hover:text-primary">
                      {payment.orderId.slice(0, 8)}…
                    </Link>
                    <Badge variant="outline" className="text-[10px] capitalize">{payment.status}</Badge>
                    <span className="font-mono text-xs font-bold tabular-nums" data-money>
                      {formatMoney(payment.amount, "BDT")}
                    </span>
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
