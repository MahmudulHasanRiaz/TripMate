"use client";

import { useId, useState, type CSSProperties } from "react";
import {
  BarChart3,
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

  // Geometry for the SVG chart (0–300 × 0–100 viewBox, screen-constant strokes).
  const gradientId = useId().replace(/:/g, "");
  const xAt = (index: number) =>
    trend.length <= 1 ? 150 : (index / (trend.length - 1)) * 300;
  const yAt = (value: number, max: number) => 96 - (value / max) * 90;
  const linePath = (values: number[], max: number) =>
    values
      .map(
        (value, index) =>
          `${index === 0 ? "M" : "L"}${xAt(index).toFixed(2)},${yAt(value, max).toFixed(2)}`,
      )
      .join(" ");
  const areaPath = (values: number[], max: number) =>
    `${linePath(values, max)} L300,100 L0,100 Z`;

  return (
    <Card className="shadow-xs border-border bg-card">
      <CardHeader className="p-4 sm:p-6 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="dot-k"
                style={{ "--k": "var(--c-green)" } as CSSProperties}
                aria-hidden="true"
              />
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
            {/* Artifact-style line + area chart (screen-constant strokes) */}
            <div
              className="relative h-56 w-full select-none"
              role="group"
              aria-label="30-day activity trend chart. Toggle Data Table for tabular view."
            >
              <svg
                viewBox="0 0 300 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full overflow-visible"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--c-green)" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="var(--c-green)" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* horizontal grid (dashed, muted) */}
                {[26, 51, 76].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="300"
                    y2={y}
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                    strokeDasharray="2 6"
                    opacity="0.55"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                {(mode === "all" || mode === "volume") && (
                  <>
                    <path
                      d={linePath(
                        trend.map((p) => p.leads),
                        maxVolume,
                      )}
                      fill="none"
                      stroke="hsl(var(--info))"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity="0.85"
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      d={linePath(
                        trend.map((p) => p.orders),
                        maxVolume,
                      )}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity="0.85"
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                )}

                {(mode === "all" || mode === "revenue") && (
                  <>
                    <path
                      d={areaPath(
                        trend.map((p) => p.revenue),
                        maxRevenue,
                      )}
                      fill={`url(#${gradientId})`}
                    />
                    <path
                      d={linePath(
                        trend.map((p) => p.revenue),
                        maxRevenue,
                      )}
                      fill="none"
                      stroke="var(--c-green)"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                )}
              </svg>

              {/* Invisible hover columns keep per-day hover + a11y labels */}
              <div className="absolute inset-0 flex gap-0">
                {trend.map((point, index) => {
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
                        "h-full flex-1 cursor-pointer rounded-xs outline-hidden transition-colors focus-visible:ring-1 focus-visible:ring-ring",
                        isHovered && "bg-secondary/30",
                      )}
                    />
                  );
                })}
              </div>

              {/* first + last date labels (artifact footer) */}
              {trend.length > 0 && (
                <div className="pointer-events-none absolute -bottom-6 left-0 right-0 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                  <span>{formatShortDate(trend[0].date)}</span>
                  <span>{formatShortDate(trend[trend.length - 1].date)}</span>
                </div>
              )}
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
