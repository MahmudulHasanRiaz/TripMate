"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Route } from "next";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { PLReport, ServiceMarginRow } from "@/modules/expenses/service";
import { formatMoney } from "@/components/site/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ExpenseReportsViewProps = {
  report: PLReport;
  margins: ServiceMarginRow[];
  initialFrom?: string;
  initialTo?: string;
};

export default function ExpenseReportsView({
  report,
  margins,
  initialFrom = "",
  initialTo = "",
}: ExpenseReportsViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const applyRange = (newFrom: string, newTo: string) => {
    const params = new URLSearchParams();
    if (newFrom) params.set("from", newFrom);
    if (newTo) params.set("to", newTo);
    const qs = params.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
  };

  const handlePreset = (preset: "this-month" | "last-month" | "ytd" | "all") => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (preset === "this-month") {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      const f = start.toISOString().slice(0, 10);
      const t = end.toISOString().slice(0, 10);
      setFrom(f);
      setTo(t);
      applyRange(f, t);
    } else if (preset === "last-month") {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      const f = start.toISOString().slice(0, 10);
      const t = end.toISOString().slice(0, 10);
      setFrom(f);
      setTo(t);
      applyRange(f, t);
    } else if (preset === "ytd") {
      const start = new Date(y, 0, 1);
      const f = start.toISOString().slice(0, 10);
      const t = now.toISOString().slice(0, 10);
      setFrom(f);
      setTo(t);
      applyRange(f, t);
    } else {
      setFrom("");
      setTo("");
      applyRange("", "");
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyRange(from, to);
  };

  // Compile monthly trend data
  const allMonthsSet = new Set<string>();
  report.revenueByMonth.forEach((r) => allMonthsSet.add(r.ym));
  report.expenseByMonth.forEach((e) => allMonthsSet.add(e.ym));
  const sortedMonths = Array.from(allMonthsSet).sort();

  const revMap = new Map(report.revenueByMonth.map((r) => [r.ym, r.amount]));
  const expMap = new Map(report.expenseByMonth.map((e) => [e.ym, e.amount]));

  const maxMonthValue = Math.max(
    1,
    ...sortedMonths.map((m) => Math.max(revMap.get(m) || 0, expMap.get(m) || 0)),
  );

  return (
    <div className="space-y-6">
      {/* Date Range Picker Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handlePreset("this-month")}
            className="h-9 text-sm font-medium rounded-lg"
          >
            This Month
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handlePreset("last-month")}
            className="h-9 text-sm font-medium rounded-lg"
          >
            Last Month
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handlePreset("ytd")}
            className="h-9 text-sm font-medium rounded-lg"
          >
            Year to Date
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handlePreset("all")}
            className="h-9 text-sm font-medium rounded-lg"
          >
            All Time
          </Button>
        </div>

        <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="rep-from" className="text-[13px] font-medium text-foreground">From:</Label>
            <Input
              id="rep-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 w-40 text-sm font-mono tabular-nums rounded-lg border-border"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="rep-to" className="text-[13px] font-medium text-foreground">To:</Label>
            <Input
              id="rep-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 w-40 text-sm font-mono tabular-nums rounded-lg border-border"
            />
          </div>
          <Button type="submit" variant="secondary" className="h-10 text-sm font-semibold rounded-lg px-4">
            Apply
          </Button>
        </form>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Revenue Card */}
        <Card className="rounded-xl shadow-xs border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Total Revenue</span>
              <DollarSign className="size-4 text-primary" aria-hidden="true" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p data-testid="report-revenue" className="font-mono tabular-nums text-2xl font-bold tracking-tight text-foreground">
              {formatMoney(report.revenue, "BDT")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="size-4 text-success shrink-0" aria-hidden="true" />
              Verified customer payments
            </p>
          </CardContent>
        </Card>

        {/* Expense Total Card */}
        <Card className="rounded-xl shadow-xs border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Total Expenses</span>
              <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p data-testid="report-expenses" className="font-mono tabular-nums text-2xl font-bold tracking-tight text-foreground">
              {formatMoney(report.expenseTotal, "BDT")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="size-4 text-destructive shrink-0" aria-hidden="true" />
              Approved operational & direct costs
            </p>
          </CardContent>
        </Card>

        {/* Net Profit / Loss Card */}
        <Card className="rounded-xl shadow-xs border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Net Profit / Margin</span>
              {report.net >= 0 ? (
                <ArrowUpRight className="size-4 text-success" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="size-4 text-destructive" aria-hidden="true" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              data-testid="report-net"
              className={`font-mono tabular-nums text-2xl font-bold tracking-tight ${
                report.net >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {formatMoney(report.net, "BDT")}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant={report.net >= 0 ? "success" : "destructive"}
                className="text-xs font-medium px-2 py-0.5"
              >
                {report.net >= 0 ? "Profitable" : "Net Deficit"}
              </Badge>
              <span className="text-sm font-mono tabular-nums text-muted-foreground">
                {report.revenue > 0
                  ? `${((report.net / report.revenue) * 100).toFixed(1)}% margin`
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Breakdowns (Token-styled Bars, no external chart dependencies) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expenses by Category */}
        <Card className="rounded-xl shadow-xs border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <BarChart2 className="size-4 text-muted-foreground" aria-hidden="true" />
              Expense Distribution by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.expenseByCategory.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No approved expenses recorded in this period.
              </p>
            ) : (
              report.expenseByCategory.map((cat) => {
                const pct =
                  report.expenseTotal > 0
                    ? Math.round((cat.amount / report.expenseTotal) * 100)
                    : 0;

                return (
                  <div key={cat.categoryId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{cat.name}</span>
                        <Badge variant="outline" className="text-xs uppercase font-mono px-1.5 py-0">
                          {cat.kind.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="font-mono tabular-nums text-right">
                        <span className="font-semibold">{formatMoney(cat.amount, "BDT")}</span>
                        <span className="text-muted-foreground ml-1.5 text-xs">({pct}%)</span>
                      </div>
                    </div>
                    {/* Token bar */}
                    <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue vs Expense Trend (Token-styled comparative bars) */}
        <Card className="rounded-xl shadow-xs border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
              Monthly Inflow vs Outflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedMonths.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No transaction data available for the selected period.
              </p>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-success" />
                    <span className="text-muted-foreground">Revenue (Verified)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Expenses (Approved)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {sortedMonths.map((ym) => {
                    const rev = revMap.get(ym) || 0;
                    const exp = expMap.get(ym) || 0;
                    const revPct = Math.round((rev / maxMonthValue) * 100);
                    const expPct = Math.round((exp / maxMonthValue) * 100);

                    return (
                      <div key={ym} className="space-y-1.5 rounded-lg border border-border/60 p-3 bg-secondary/15">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-mono font-semibold tabular-nums text-foreground">{ym}</span>
                          <span className="text-xs text-muted-foreground font-mono tabular-nums">
                            Rev: <strong className="text-foreground">{formatMoney(rev, "BDT")}</strong> | Exp:{" "}
                            <strong className="text-foreground">{formatMoney(exp, "BDT")}</strong>
                          </span>
                        </div>

                        {/* Comparative horizontal bars */}
                        <div className="space-y-1.5 pt-1">
                          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-success transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(rev > 0 ? 3 : 0, revPct))}%` }}
                            />
                          </div>
                          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(exp > 0 ? 3 : 0, expPct))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Margin Breakdown Table */}
      <Card className="rounded-xl shadow-xs border-border bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/80">
          <CardTitle className="text-sm font-semibold text-foreground">Service Line Profitability & Margins</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Direct comparison between verified customer payments and order-linked fulfillment costs by catalog category.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border/80">
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5 pl-6">Service Category</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Gross Revenue</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Direct Order Costs</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Gross Margin</TableHead>
                <TableHead className="w-[120px] text-right text-[13px] font-semibold text-muted-foreground py-3.5 pr-6">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {margins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                    No order-linked margins available for this range.
                  </TableCell>
                </TableRow>
              ) : (
                margins.map((row) => {
                  const marginPct =
                    row.revenue > 0 ? ((row.margin / row.revenue) * 100).toFixed(1) : "0.0";

                  return (
                    <TableRow key={row.categoryId} className="min-h-[52px] text-sm hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3.5 pl-6 font-semibold text-foreground">{row.categoryName}</TableCell>
                      <TableCell className="py-3.5 font-mono font-medium tabular-nums">
                        {formatMoney(row.revenue, "BDT")}
                      </TableCell>
                      <TableCell className="py-3.5 font-mono text-muted-foreground tabular-nums">
                        {formatMoney(row.directCost, "BDT")}
                      </TableCell>
                      <TableCell
                        className={`py-3.5 font-mono font-semibold tabular-nums ${
                          row.margin >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {formatMoney(row.margin, "BDT")}
                      </TableCell>
                      <TableCell className="py-3.5 pr-6 text-right">
                        <Badge
                          variant={row.margin >= 0 ? "success" : "destructive"}
                          className="text-xs font-mono tabular-nums px-2 py-0.5"
                        >
                          {marginPct}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
