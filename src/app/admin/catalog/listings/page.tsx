import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Plus } from "lucide-react";
import { listAllListings } from "@/modules/catalog/service";
import { listingStatusSchema } from "@/modules/catalog/validation";
import type { ListingStatus } from "@/modules/catalog/validation";
import { LISTING_STATUS_META, formatPrice } from "@/modules/catalog/status-meta";
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
import ListingFilters from "./ListingFilters";
import ListingRowActions from "./ListingRowActions";

export const metadata: Metadata = { title: "Listings · Catalog" };

// Fresh, per-request DB reads behind an auth gate — no static shell to serve.
export const instant = false;

type SearchParams = {
  q?: string;
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

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const statusRaw = typeof sp.status === "string" ? sp.status : "";
  const status: ListingStatus | undefined = listingStatusSchema.safeParse(statusRaw).success
    ? (statusRaw as ListingStatus)
    : undefined;
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const { items, total } = await listAllListings({ search: q || undefined, status, page, perPage: PER_PAGE });

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageParams = (delta: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    params.set("page", String(Math.min(totalPages, Math.max(1, page + delta))));
    return params.toString();
  };

  const empty = items.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Listings</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="tabular-nums font-medium text-foreground">{total}</span> {total === 1 ? "result" : "results"}
          </p>
        </div>
        <Button asChild className="h-10 px-4 rounded-lg text-sm font-semibold gap-2 shadow-xs">
          <Link href={"/admin/catalog/listings/new" as Route}>
            <Plus className="size-4" aria-hidden="true" />
            New listing
          </Link>
        </Button>
      </div>

      <ListingFilters initialQ={q} initialStatus={status ?? ""} />

      <Card className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Listing</TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Updated</TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empty ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Plus className="size-6" aria-hidden="true" />
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-foreground">
                            {q || status ? "No listings found" : "No listings created yet"}
                          </h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {q || status
                              ? "Try adjusting your search terms or status filter."
                              : "Start by publishing your first package, tour, or service listing."}
                          </p>
                        </div>
                        {q || status ? (
                          <Button asChild variant="outline" size="sm" className="mt-2 h-9 rounded-lg text-sm">
                            <Link href={"/admin/catalog/listings" as Route}>Reset Filters</Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" className="mt-2 h-10 px-4 rounded-lg text-sm font-semibold shadow-xs">
                            <Link href={"/admin/catalog/listings/new" as Route}>
                              <Plus className="size-4" aria-hidden="true" />
                              Create your first listing
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((listing) => {
                    const meta = LISTING_STATUS_META[listing.status];
                    return (
                      <TableRow key={listing.id} className="min-h-[52px] border-b border-border transition-colors hover:bg-muted/30">
                        <TableCell className="py-3.5">
                          <Link
                            href={`/admin/catalog/listings/${listing.id}/edit` as Route}
                            className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                          >
                            {listing.title}
                          </Link>
                          <p className="text-xs text-muted-foreground font-mono">{listing.slug}</p>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-sm text-foreground">{listing.category.name}</span>
                          {listing.destination ? (
                            <p className="text-xs text-muted-foreground">
                              {listing.destination.name}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="py-3.5 text-right font-mono text-sm font-bold text-foreground tabular-nums">
                          {formatPrice(listing.price, listing.currency)}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge variant={meta.variant} className="capitalize text-xs font-medium px-2 py-0.5">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 text-sm text-muted-foreground tabular-nums">
                          {dateCell(listing.updatedAt)}
                        </TableCell>
                        <TableCell className="py-3.5 text-right">
                          <ListingRowActions
                            listingId={listing.id}
                            status={listing.status}
                            title={listing.title}
                            slug={listing.slug}
                            initialSeo={listing.seo}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
          >
            <Link href={page > 1 ? (`/admin/catalog/listings?${pageParams(-1)}` as Route) : "#"}>
              Previous
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            asChild
            variant="outline"
            size="sm"
            aria-disabled={page >= totalPages}
            className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
          >
            <Link
              href={page < totalPages ? (`/admin/catalog/listings?${pageParams(1)}` as Route) : "#"}
            >
              Next
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
