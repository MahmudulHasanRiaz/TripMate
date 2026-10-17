"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { Kanban, List, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORDER_STATUSES, type OrderStatus } from "@/modules/bookings/validation";
import { cn } from "@/lib/utils";

type OrdersFiltersProps = {
  initialSearch: string;
  initialStatus: string;
  currentView: "board" | "list";
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export default function OrdersFilters({
  initialSearch,
  initialStatus,
  currentView,
}: OrdersFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  const navigate = (nextSearch: string, nextStatus: string, nextView = currentView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSearch) params.set("search", nextSearch);
    else params.delete("search");

    if (nextStatus) params.set("status", nextStatus);
    else params.delete("status");

    if (nextView === "list") params.set("view", "list");
    else params.delete("view"); // default is board

    params.delete("page");
    const qs = params.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(search.trim(), initialStatus);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end justify-between">
      <form onSubmit={submitSearch} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-sm">
          <Label htmlFor="orders-search" className="mb-1.5 block text-xs font-medium">
            Search
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="orders-search"
              type="search"
              placeholder="Search by order #, customer, phone..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {currentView === "list" ? (
          <div className="w-full sm:w-44">
            <Label htmlFor="orders-status-filter" className="mb-1.5 block text-xs font-medium">
              Status
            </Label>
            <Select
              value={initialStatus || "all"}
              onValueChange={(v) => navigate(search.trim(), v === "all" ? "" : v)}
            >
              <SelectTrigger id="orders-status-filter" className="w-full h-9 text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status} className="text-xs">
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <Button type="submit" variant="secondary" size="sm" className="h-9 text-xs">
          Filter
        </Button>
      </form>

      {/* View Toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5 self-start sm:self-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(search.trim(), initialStatus, "board")}
          className={cn(
            "h-8 px-2.5 text-xs font-medium gap-1.5",
            currentView === "board" ? "bg-secondary text-foreground shadow-xs" : "text-muted-foreground",
          )}
          aria-pressed={currentView === "board"}
        >
          <Kanban className="size-3.5" aria-hidden="true" />
          Board
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(search.trim(), initialStatus, "list")}
          className={cn(
            "h-8 px-2.5 text-xs font-medium gap-1.5",
            currentView === "list" ? "bg-secondary text-foreground shadow-xs" : "text-muted-foreground",
          )}
          aria-pressed={currentView === "list"}
        >
          <List className="size-3.5" aria-hidden="true" />
          List
        </Button>
      </div>
    </div>
  );
}
