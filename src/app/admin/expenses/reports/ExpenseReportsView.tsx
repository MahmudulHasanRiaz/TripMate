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
            size="sm"
            onClick={() => handlePreset("this-month")}
            className="h-8 text-xs"
          >
            This Month
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePreset("last-month")}
            className="h-8 text-xs"
          >
            Last Month
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePreset("ytd")}
            className="h-8 text-xs"
          >
            Year to Date
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePreset("all")}
            className="h-8 text-xs"
          >
            All Time
          </Button>
        </div>

        <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="rep-from" className="text-xs text-muted-foreground">From:</Label>
            <Input
              id="rep-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-36 text-xs font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="rep-to" className="text-xs text-muted-foreground">To:</Label>
            <Input
              id="rep-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-36 text-xs font-mono"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
            Apply
          </Button>
        </form>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Revenue Card */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Total Revenue</span>
              <DollarSign className="size-4 text-primary" aria-hidden="true" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p data-testid="report-revenue" className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {formatMoney(report.revenue, "BDT")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="size-3.5 text-success shrink-0" aria-hidden="true" />
              Verified customer payments
            </p>
          </CardContent>
        </Card>

        {/* Expense Total Card */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Total Expenses</span>
              <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p data-testid="report-expenses" className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {formatMoney(report.expenseTotal, "BDT")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="size-3.5 text-destructive shrink-0" aria-hidden="true" />
              Approved operational & direct costs
            </p>
          </CardContent>
        </Card>

        {/* Net Profit / Loss Card */}
        <Card className="shadow-xs border-border bg-card">
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
              className={`font-mono text-2xl font-bold tracking-tight ${
                report.net >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {formatMoney(report.net, "BDT")}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant={report.net >= 0 ? "success" : "destructive"}
                className="text-[10px] px-1.5 py-0"
              >
                {report.net >= 0 ? "Profitable" : "Net Deficit"}
              </Badge>
              <span className="text-xs text-muted-foreground">
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
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="size-4 text-muted-foreground" aria-hidden="true" />
              Expense Distribution by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.expenseByCategory.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
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
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{cat.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono px-1 py-0">
                          {cat.kind.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="font-mono text-right">
                        <span className="font-semibold">{formatMoney(cat.amount, "BDT")}</span>
                        <span className="text-muted-foreground ml-1.5 text-[11px]">({pct}%)</span>
                      </div>
                    </div>
                    {/* Token bar */}
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
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
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
              Monthly Inflow vs Outflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedMonths.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No transaction data available for the selected period.
              </p>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-success" />
                    <span className="text-muted-foreground">Revenue (Verified)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
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
                      <div key={ym} className="space-y-1 rounded-lg border border-border/60 p-2.5 bg-secondary/15">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-semibold text-foreground">{ym}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Rev: <strong className="text-foreground">{formatMoney(rev, "BDT")}</strong> | Exp:{" "}
                            <strong className="text-foreground">{formatMoney(exp, "BDT")}</strong>
                          </span>
                        </div>

                        {/* Comparative horizontal bars */}
                        <div className="space-y-1 pt-1">
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
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Service Line Profitability & Margins</CardTitle>
          <p className="text-xs text-muted-foreground">
            Direct comparison between verified customer payments and order-linked fulfillment costs by catalog category.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold">Service Category</TableHead>
                <TableHead className="text-xs font-semibold">Gross Revenue</TableHead>
                <TableHead className="text-xs font-semibold">Direct Order Costs</TableHead>
                <TableHead className="text-xs font-semibold">Gross Margin</TableHead>
                <TableHead className="w-[120px] text-right text-xs font-semibold">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {margins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                    No order-linked margins available for this range.
                  </TableCell>
                </TableRow>
              ) : (
                margins.map((row) => {
                  const marginPct =
                    row.revenue > 0 ? ((row.margin / row.revenue) * 100).toFixed(1) : "0.0";

                  return (
                    <TableRow key={row.categoryId} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-semibold text-foreground">{row.categoryName}</TableCell>
                      <TableCell className="font-mono font-medium">
                        {formatMoney(row.revenue, "BDT")}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {formatMoney(row.directCost, "BDT")}
                      </TableCell>
                      <TableCell
                        className={`font-mono font-semibold ${
                          row.margin >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {formatMoney(row.margin, "BDT")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={row.margin >= 0 ? "success" : "destructive"}
                          className="text-[10px] font-mono px-2 py-0"
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
