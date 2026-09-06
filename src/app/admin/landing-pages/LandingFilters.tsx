"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { Search } from "lucide-react";
import { LANDING_PAGE_STATUSES } from "@/modules/landing-pages/validation";
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

export default function LandingFilters({
  initialSearch,
  initialStatus,
}: {
  initialSearch: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  const navigate = (nextSearch: string, nextStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSearch) params.set("search", nextSearch);
    else params.delete("search");
    if (nextStatus) params.set("status", nextStatus);
    else params.delete("status");
    params.delete("page");
    const qs = params.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(search.trim(), initialStatus);
  };

  return (
    <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="w-full sm:max-w-sm">
        <Label htmlFor="landing-search" className="mb-1.5 block text-sm font-medium">
          Search
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="landing-search"
            type="search"
            placeholder="Search by title..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="w-full sm:w-44">
        <Label htmlFor="landing-status-filter" className="mb-1.5 block text-sm font-medium">
          Filter by status
        </Label>
        <Select
          value={initialStatus || "all"}
          onValueChange={(v) => navigate(search.trim(), v === "all" ? "" : v)}
        >
          <SelectTrigger id="landing-status-filter" className="w-full h-10">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LANDING_PAGE_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" variant="secondary" className="h-10 sm:mb-px">
        Search
      </Button>
    </form>
  );
}
