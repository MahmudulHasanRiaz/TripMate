"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { Search } from "lucide-react";
import { LISTING_STATUSES } from "@/modules/catalog/validation";
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

/**
 * URL-state filters for the listing table: a search box and a status select.
 * Both write straight into the query string (`q`, `status`) and reset the page
 * to 1, so the server page re-renders from searchParams — filters stay
 * deep-linkable and back/forward work for free.
 */
export default function ListingFilters({
  initialQ,
  initialStatus,
}: {
  initialQ: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);

  const navigate = (nextQ: string, nextStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQ) params.set("q", nextQ);
    else params.delete("q");
    if (nextStatus) params.set("status", nextStatus);
    else params.delete("status");
    params.delete("page");
    const qs = params.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(q.trim(), initialStatus);
  };

  return (
    <form
      onSubmit={submitSearch}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="w-full sm:max-w-sm">
        <Label htmlFor="listing-search" className="mb-1.5 block text-[13px] font-medium text-foreground">
          Search
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="listing-search"
            type="search"
            placeholder="Search by title or destination..."
            className="pl-9 h-10 text-sm rounded-lg border-border"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="w-full sm:w-48">
        <Label htmlFor="listing-status-filter" className="mb-1.5 block text-[13px] font-medium text-foreground">
          Filter by status
        </Label>
        <Select
          value={initialStatus || "all"}
          onValueChange={(v) => navigate(q.trim(), v === "all" ? "" : v)}
        >
          <SelectTrigger id="listing-status-filter" className="w-full h-10 text-sm rounded-lg border-border">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">All statuses</SelectItem>
            {LISTING_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize text-sm">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" variant="secondary" className="h-10 px-4 rounded-lg text-sm font-medium shadow-xs">
        Filter
      </Button>
    </form>
  );
}
