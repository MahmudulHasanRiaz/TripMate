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
          <Label htmlFor="orders-search" className="mb-1.5 block text-[13px] font-medium text-foreground">
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
              className="pl-9 h-10 text-sm rounded-lg border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {currentView === "list" ? (
          <div className="w-full sm:w-48">
            <Label htmlFor="orders-status-filter" className="mb-1.5 block text-[13px] font-medium text-foreground">
              Status
            </Label>
            <Select
              value={initialStatus || "all"}
              onValueChange={(v) => navigate(search.trim(), v === "all" ? "" : v)}
            >
              <SelectTrigger id="orders-status-filter" className="w-full h-10 text-sm rounded-lg border-border">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">All statuses</SelectItem>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status} className="text-sm">
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <Button type="submit" variant="secondary" className="h-10 px-4 text-sm font-medium rounded-lg shadow-xs">
          Filter
        </Button>
      </form>

      {/* View Toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 self-start sm:self-auto shadow-xs">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(search.trim(), initialStatus, "board")}
          className={cn(
            "h-8 px-3 text-sm font-medium gap-1.5 rounded-md transition-all duration-150 ease-out",
            currentView === "board" ? "bg-secondary text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={currentView === "board"}
        >
          <Kanban className="size-4" aria-hidden="true" />
          Board
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(search.trim(), initialStatus, "list")}
          className={cn(
            "h-8 px-3 text-sm font-medium gap-1.5 rounded-md transition-all duration-150 ease-out",
            currentView === "list" ? "bg-secondary text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={currentView === "list"}
        >
          <List className="size-4" aria-hidden="true" />
          List
        </Button>
      </div>
    </div>
  );
}
