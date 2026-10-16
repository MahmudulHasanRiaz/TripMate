"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DashboardPreset } from "@/modules/dashboard/service";
import { cn } from "@/lib/utils";

const PRESETS: { value: DashboardPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

/**
 * Dashboard range picker (§2.10): one-click presets + calendar range inputs.
 * Navigates with ?preset=&from=&to=; the server resolves and aggregates.
 */
export default function DashboardRangeFilter({
  preset,
  from,
  to,
}: {
  preset: DashboardPreset;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const go = (p: DashboardPreset, f?: string, t?: string) => {
    const params = new URLSearchParams();
    params.set("preset", p);
    if (p === "custom" && f && t) {
      params.set("from", f);
      params.set("to", t);
    }
    router.push(`/admin?${params.toString()}` as Route);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => (p.value === "custom" ? go("custom", customFrom, customTo) : go(p.value))}
            className={cn(
              "h-8 px-2.5 text-xs font-medium gap-1.5",
              preset === p.value ? "bg-secondary text-foreground shadow-xs" : "text-muted-foreground",
            )}
            aria-pressed={preset === p.value}
          >
            {p.value === "custom" && <CalendarDays className="size-3.5" aria-hidden="true" />}
            {p.label}
          </Button>
        ))}
      </div>
      {preset === "custom" ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (customFrom && customTo) go("custom", customFrom, customTo);
          }}
        >
          <Input
            type="date"
            aria-label="From date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-9 w-auto text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-9 w-auto text-xs"
          />
          <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs">
            Apply
          </Button>
        </form>
      ) : (
        <span className="font-mono text-xs text-muted-foreground">
          {from === to ? from : `${from} → ${to}`}
        </span>
      )}
    </div>
  );
}
