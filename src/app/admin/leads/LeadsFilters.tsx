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
import { cn } from "@/lib/utils";

type StaffUser = { id: string; name: string };

type LeadsFiltersProps = {
  initialSearch: string;
  initialAssignedTo: string;
  currentView: "board" | "list";
  staffUsers: StaffUser[];
};

export default function LeadsFilters({
  initialSearch,
  initialAssignedTo,
  currentView,
  staffUsers,
}: LeadsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  const navigate = (nextSearch: string, nextAssigned: string, nextView = currentView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSearch) params.set("search", nextSearch);
    else params.delete("search");

    if (nextAssigned) params.set("assignedTo", nextAssigned);
    else params.delete("assignedTo");

    if (nextView === "board") params.set("view", "board");
    else params.delete("view"); // default is list (§3)

    params.delete("page");
    const qs = params.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(search.trim(), initialAssignedTo);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end justify-between">
      <form onSubmit={submitSearch} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-sm">
          <Label htmlFor="leads-search" className="mb-1.5 block text-xs font-medium">
            Search
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="leads-search"
              type="search"
              placeholder="Search by name, phone, email..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full sm:w-48">
          <Label htmlFor="leads-assignee-filter" className="mb-1.5 block text-xs font-medium">
            Assigned to
          </Label>
          <Select
            value={initialAssignedTo || "all"}
            onValueChange={(v) => navigate(search.trim(), v === "all" ? "" : v)}
          >
            <SelectTrigger id="leads-assignee-filter" className="w-full h-9 text-xs">
              <SelectValue placeholder="All assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All assignees</SelectItem>
              <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
              {staffUsers.map((staff) => (
                <SelectItem key={staff.id} value={staff.id} className="text-xs">
                  {staff.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" variant="secondary" size="sm" className="h-9 text-xs">
          Filter
        </Button>
      </form>

      {/* View Toggle */}
      <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => navigate(search.trim(), initialAssignedTo, "board")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
            currentView === "board"
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Kanban className="size-3.5" aria-hidden="true" />
          Board
        </button>
        <button
          type="button"
          onClick={() => navigate(search.trim(), initialAssignedTo, "list")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
            currentView === "list"
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <List className="size-3.5" aria-hidden="true" />
          List
        </button>
      </div>
    </div>
  );
}
