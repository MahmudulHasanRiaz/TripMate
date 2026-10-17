"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * URL-state search for the media library. Typing a query and submitting writes
 * `q` into the query string and resets to page 1, so results stay
 * deep-linkable and the server grid re-renders from searchParams.
 */
export default function MediaSearch({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const query = q.trim();
    if (query) params.set("q", query);
    else params.delete("q");
    params.delete("page");
    const qs = params.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      className="flex flex-col gap-3 sm:flex-row sm:items-end rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="w-full sm:max-w-md">
        <Label htmlFor="media-search" className="mb-1.5 block text-[13px] font-medium text-foreground">
          Search Media
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="media-search"
            type="search"
            placeholder="Search by file name or alt text..."
            className="pl-9 h-10 text-sm rounded-lg border-border"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" variant="secondary" className="h-10 text-sm font-semibold rounded-lg px-4 sm:mb-px">
        Search
      </Button>
    </form>
  );
}
