"use client";

import { useId, useState } from "react";
import {
  BarChart3,
  Calendar,
  Table as TableIcon,
  TrendingUp,
} from "lucide-react";
import type { DashboardTrendPoint } from "@/modules/dashboard/service";
import { formatMoney } from "@/components/site/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type MetricMode = "all" | "volume" | "revenue";

type DashboardTrendViewProps = {
  trend: DashboardTrendPoint[];
};

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length < 3) return isoDate;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${monthNames[monthIdx] ?? parts[1]} ${day}`;
}

export default function DashboardTrendView({ trend }: DashboardTrendViewProps) {
  const [mode, setMode] = useState<MetricMode>("all");
  const [showTable, setShowTable] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const tableId = useId();

  // Summary aggregates over the 30-day window
  const totalLeads = trend.reduce((sum, p) => sum + p.leads, 0);
  const totalOrders = trend.reduce((sum, p) => sum + p.orders, 0);
  const totalRevenue = trend.reduce((sum, p) => sum + p.revenue, 0);

  const maxVolume = Math.max(1, ...trend.map((p) => Math.max(p.leads, p.orders)));
  const maxRevenue = Math.max(1, ...trend.map((p) => p.revenue));

  const activePoint = hoveredIndex !== null ? trend[hoveredIndex] : null;

  return (
    <Card className="shadow-xs border-border bg-card">
      <CardHeader className="p-4 sm:p-6 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
              <CardTitle className="text-base font-semibold tracking-tight">
                30-Day Activity & Revenue Trend
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Continuous 30-day timeline of incoming leads, confirmed orders, and verified revenue.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="radiogroup"
              aria-label="Metric display mode"
              className="inline-flex rounded-lg border border-border bg-secondary/30 p-0.5"
            >
              <button
                type="button"
                role="radio"
                aria-checked={mode === "all"}
                onClick={() => setMode("all")}
                className={cn(
                  "min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  mode === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All Metrics
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === "volume"}
                onClick={() => setMode("volume")}
                className={cn(
                  "min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  mode === "volume"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Volume Only
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === "revenue"}
                onClick={() => setMode("revenue")}
                className={cn(
                  "min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  mode === "revenue"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Revenue Only
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTable((prev) => !prev)}
              aria-expanded={showTable}
              aria-controls={tableId}
              className="min-h-[36px] text-xs gap-1.5"
            >
              {showTable ? (
                <>
                  <BarChart3 className="size-3.5" aria-hidden="true" />
                  Show Chart
                </>
              ) : (
                <>
                  <TableIcon className="size-3.5" aria-hidden="true" />
                  Data Table
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Legend + 30d Window Totals */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 mt-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {(mode === "all" || mode === "volume") && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-info" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    Leads: <strong className="text-foreground font-mono">{totalLeads}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    Orders: <strong className="text-foreground font-mono">{totalOrders}</strong>
                  </span>
                </div>
              </>
            )}
            {(mode === "all" || mode === "revenue") && (
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-success" aria-hidden="true" />
                <span className="text-muted-foreground">
                  Revenue: <strong className="text-foreground font-mono">{formatMoney(totalRevenue, "BDT")}</strong>
                </span>
              </div>
            )}
          </div>

          {activePoint && (
            <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-2.5 py-1 text-xs font-mono">
              <span className="font-semibold text-foreground">{formatShortDate(activePoint.date)}</span>
              <span className="text-muted-foreground">|</span>
              {(mode === "all" || mode === "volume") && (
                <>
                  <span className="text-info font-medium">{activePoint.leads} leads</span>
                  <span className="text-primary font-medium">{activePoint.orders} orders</span>
                </>
              )}
              {(mode === "all" || mode === "revenue") && (
                <span className="text-success font-medium">{formatMoney(activePoint.revenue, "BDT")}</span>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-2">
        {!showTable ? (
          <div className="space-y-3">
            {/* Visual Token-styled Daily Bar Chart */}
            <div
              className="relative h-56 w-full pt-4 pb-8 flex items-end gap-1 sm:gap-1.5 select-none overflow-x-auto"
              role="group"
              aria-label="30-day activity trend chart. Toggle Data Table for tabular view."
            >
              {trend.map((point, index) => {
                const leadHeightPct = Math.round((point.leads / maxVolume) * 100);
                const orderHeightPct = Math.round((point.orders / maxVolume) * 100);
                const revHeightPct = Math.round((point.revenue / maxRevenue) * 100);

                const isHovered = hoveredIndex === index;

                return (
                  <div
                    key={point.date}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    tabIndex={0}
                    aria-label={`${formatShortDate(point.date)}: ${point.leads} leads, ${point.orders} orders, ${formatMoney(point.revenue, "BDT")} revenue`}
                    className={cn(
                      "group relative flex-1 min-w-[8px] sm:min-w-[14px] h-full flex flex-col justify-end items-center cursor-pointer rounded-xs transition-colors outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
                      isHovered && "bg-secondary/40",
                    )}
                  >
                    {/* Bar container */}
                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-40">
                      {(mode === "all" || mode === "volume") && (
                        <>
                          {/* Leads bar */}
                          <div
                            className={cn(
                              "w-1/3 sm:w-2 rounded-t-xs bg-info transition-all duration-200",
                              isHovered ? "opacity-100" : "opacity-80",
                            )}
                            style={{
                              height: `${point.leads > 0 ? Math.max(4, leadHeightPct) : 0}%`,
                            }}
                          />
                          {/* Orders bar */}
                          <div
                            className={cn(
                              "w-1/3 sm:w-2 rounded-t-xs bg-primary transition-all duration-200",
                              isHovered ? "opacity-100" : "opacity-80",
                            )}
                            style={{
                              height: `${point.orders > 0 ? Math.max(4, orderHeightPct) : 0}%`,
                            }}
                          />
                        </>
                      )}
                      {(mode === "all" || mode === "revenue") && (
                        /* Revenue bar */
                        <div
                          className={cn(
                            "w-1/3 sm:w-2 rounded-t-xs bg-success transition-all duration-200",
                            isHovered ? "opacity-100" : "opacity-80",
                          )}
                          style={{
                            height: `${point.revenue > 0 ? Math.max(4, revHeightPct) : 0}%`,
                          }}
                        />
                      )}
                    </div>

                    {/* Date label (spaced out) */}
                    {(index % 5 === 0 || index === trend.length - 1) && (
                      <span className="absolute -bottom-6 text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                        {formatShortDate(point.date)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quiet baseline footnote */}
            <p className="text-[11px] text-muted-foreground pt-4 text-center sm:text-left flex items-center gap-1">
              <TrendingUp className="size-3 text-muted-foreground shrink-0" aria-hidden="true" />
              Continuous daily series anchored to database current date. Hover or tab through bars for day totals.
            </p>
          </div>
        ) : (
          /* Accessible Table Fallback */
          <div id={tableId} className="space-y-2">
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <caption className="sr-only">
                    30-Day Activity and Revenue Data Table
                  </caption>
                  <TableHeader className="bg-secondary/40 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Leads Created</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Orders Created</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Verified Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trend.map((point) => (
                      <TableRow key={point.date} className="text-xs font-mono hover:bg-muted/20">
                        <TableCell className="font-semibold text-foreground">
                          {point.date} ({formatShortDate(point.date)})
                        </TableCell>
                        <TableCell className="text-right">
                          {point.leads > 0 ? (
                            <Badge variant="info" className="px-1.5 py-0 text-[10px]">
                              {point.leads}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {point.orders > 0 ? (
                            <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                              {point.orders}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {point.revenue > 0 ? (
                            <span className="font-semibold text-success">
                              {formatMoney(point.revenue, "BDT")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">৳0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
