import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  DollarSign,
  Receipt,
  UserCheck,
  Users,
} from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import { menuForRole } from "@/lib/admin-menu";
import { getDashboardKpis, getDashboardTrend } from "@/modules/dashboard/service";
import type { OrderStatus } from "@/modules/bookings/validation";
import { ORDER_STATUSES } from "@/modules/bookings/validation";
import { formatMoney } from "@/components/site/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import DashboardTrendView from "./DashboardTrendView";

export const metadata: Metadata = {
  title: "Dashboard",
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  in_review: "In Review",
  quoted: "Quoted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ORDER_STATUS_BADGE_VARIANTS: Record<
  OrderStatus,
  "secondary" | "info" | "default" | "warning" | "success" | "destructive"
> = {
  pending: "secondary",
  in_review: "info",
  quoted: "info",
  confirmed: "success",
  completed: "default",
  cancelled: "destructive",
};

export default async function AdminDashboardPage() {
  const [session, kpis, trend] = await Promise.all([
    requireSession(),
    getDashboardKpis(),
    getDashboardTrend({ days: 30 }),
  ]);

  const sections = menuForRole(session.user.role).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Overview of inquiries, orders, payments, expenses, and operational queues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono font-normal">
            Menu sections: {sections}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize font-medium">
            {session.user.role}
          </Badge>
        </div>
      </div>

      {/* KPI Cards Row (Compact 6-up / responsive grid) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Leads Today / Total */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Leads Today</span>
              <Users className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-xl font-bold tracking-tight text-foreground">
              {kpis.leadsToday}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Total: <strong className="text-foreground font-mono">{kpis.leadsTotal}</strong></span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 font-mono">
                {kpis.leadConversionRate}% conv
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Pending Payments</span>
              <Banknote className="size-3.5 text-warning" aria-hidden="true" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-xl font-bold tracking-tight text-foreground">
              {kpis.pendingPaymentsCount}
            </p>
            <Link
              href={"/admin/payments" as Route}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <span>Awaiting verification</span>
              <ArrowRight className="size-2.5" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        {/* Unassigned Leads */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Unassigned Leads</span>
              <UserCheck className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-xl font-bold tracking-tight text-foreground">
              {kpis.unassignedLeadsCount}
            </p>
            <Link
              href={"/admin/leads" as Route}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <span>Needs staff assign</span>
              <ArrowRight className="size-2.5" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        {/* Revenue This Month */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Total Revenue</span>
              <DollarSign className="size-3.5 text-primary" aria-hidden="true" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-bold tracking-tight text-foreground truncate">
              {formatMoney(kpis.revenueThisMonth, "BDT")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              This month (verified)
            </p>
          </CardContent>
        </Card>

        {/* Expenses This Month */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Total Expenses</span>
              <Receipt className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-bold tracking-tight text-foreground truncate">
              {formatMoney(kpis.expensesThisMonth, "BDT")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              This month (approved)
            </p>
          </CardContent>
        </Card>

        {/* Net Profit / Loss */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Net Profit</span>
              {kpis.netThisMonth >= 0 ? (
                <ArrowUpRight className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="size-3.5 text-destructive" aria-hidden="true" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p
              className={cn(
                "font-mono text-lg font-bold tracking-tight truncate",
                kpis.netThisMonth >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {formatMoney(kpis.netThisMonth, "BDT")}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge
                variant={kpis.netThisMonth >= 0 ? "success" : "destructive"}
                className="text-[10px] px-1 py-0"
              >
                {kpis.netThisMonth >= 0 ? "Profitable" : "Deficit"}
              </Badge>
              <span className="text-[11px] text-muted-foreground">This month</span>
            </div>
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
                className="group flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-xs hover:border-primary/40 hover:bg-secondary/20 transition-all min-h-[44px]"
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
      <div className="grid gap-4 md:grid-cols-2">
        {/* Payment Verification Queue */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Banknote className="size-4 text-muted-foreground" aria-hidden="true" />
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
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="size-4 text-muted-foreground" aria-hidden="true" />
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
      </div>

      {/* 30-Day Trend Chart */}
      <DashboardTrendView trend={trend} />
    </div>
  );
}
