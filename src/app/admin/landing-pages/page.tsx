import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Globe, Plus } from "lucide-react";
import { listLandingPages } from "@/modules/landing-pages/service";
import type { LandingPageStatus } from "@/modules/landing-pages/validation";
import { statusSchema } from "@/modules/landing-pages/validation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import LandingFilters from "./LandingFilters";
import LandingRowActions from "./LandingRowActions";

export const metadata: Metadata = { title: "Landing Pages · TripMate Admin" };
export const instant = false;

type SearchParams = {
  search?: string;
  status?: string;
  page?: string;
};

const PER_PAGE = 20;

function dateCell(value: Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function LandingPagesIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search.trim() : "";
  const statusRaw = typeof sp.status === "string" ? sp.status : "";
  const status: LandingPageStatus | undefined = statusSchema.safeParse(statusRaw).success
    ? (statusRaw as LandingPageStatus)
    : undefined;
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const { items, total } = await listLandingPages({
    search: search || undefined,
    status,
    page,
    perPage: PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageParams = (delta: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("page", String(Math.min(totalPages, Math.max(1, page + delta))));
    return params.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Landing Pages</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {total === 1 ? "page" : "pages"} configured for high-converting marketing campaigns
          </p>
        </div>
        <Button asChild className="h-10 text-sm font-semibold gap-2 rounded-lg bg-primary text-primary-foreground">
          <Link href={"/admin/landing-pages/new" as Route}>
            <Plus className="size-4" aria-hidden="true" />
            New Landing Page
          </Link>
        </Button>
      </div>

      <LandingFilters initialSearch={search} initialStatus={status ?? ""} />

      <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Globe className="size-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">No landing pages found</h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  {search || status
                    ? "No landing pages match the active filters. Try adjusting your search query."
                    : "No campaign landing pages created yet. Launch your first marketing funnel."}
                </p>
                {search || status ? (
                  <Button asChild variant="outline" className="mt-5 h-9 rounded-lg text-sm font-semibold">
                    <Link href={"/admin/landing-pages" as Route}>
                      Clear Filters
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="mt-5 h-10 gap-2 rounded-lg text-sm font-semibold">
                    <Link href={"/admin/landing-pages/new" as Route}>
                      <Plus className="size-4" /> Create Landing Page
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border/80">
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5 pl-6">Title &amp; Slug</TableHead>
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Status</TableHead>
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">FB Content ID</TableHead>
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Updated</TableHead>
                    <TableHead className="w-[120px] text-right text-[13px] font-semibold text-muted-foreground py-3.5 pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {items.map((item) => (
                    <TableRow key={item.id} className="min-h-[52px] text-sm hover:bg-muted/30 transition-colors">
                      <TableCell className="max-w-xs py-3.5 pl-6">
                        <Link
                          href={`/admin/landing-pages/${item.id}/edit` as Route}
                          className="font-semibold text-foreground hover:underline"
                        >
                          {item.title}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          <span>/l/{item.slug}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge
                          variant={item.status === "published" ? "success" : "secondary"}
                          className="capitalize text-xs font-medium"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-xs font-mono text-muted-foreground">
                        {item.fbContentId ? item.fbContentId : "—"}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm font-mono tabular-nums text-muted-foreground">
                        {dateCell(item.updatedAt)}
                      </TableCell>
                      <TableCell className="py-3.5 pr-6 text-right">
                        <LandingRowActions
                          id={item.id}
                          slug={item.slug}
                          status={item.status}
                          title={item.title}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
          <div>
            Showing <span className="font-semibold tabular-nums text-foreground">{items.length}</span> of{" "}
            <span className="font-semibold tabular-nums text-foreground">{total}</span> pages
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className={`h-9 gap-1 text-sm rounded-lg font-medium ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              <Link href={`/admin/landing-pages?${pageParams(-1)}` as Route}>Previous</Link>
            </Button>
            <span className="text-sm tabular-nums font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className={`h-9 gap-1 text-sm rounded-lg font-medium ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            >
              <Link href={`/admin/landing-pages?${pageParams(1)}` as Route}>Next</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
