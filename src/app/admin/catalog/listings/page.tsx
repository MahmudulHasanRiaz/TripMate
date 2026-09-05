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
          <h2 className="text-lg font-semibold tracking-tight">Listings</h2>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "result" : "results"}
          </p>
        </div>
        <Button asChild>
          <Link href={"/admin/catalog/listings/new" as Route}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New listing
          </Link>
        </Button>
      </div>

      <ListingFilters initialQ={q} initialStatus={status ?? ""} />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Listing</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empty ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <p className="font-medium text-muted-foreground">
                        {q || status
                          ? "No listings match these filters."
                          : "No listings yet."}
                      </p>
                      {!(q || status) ? (
                        <Button asChild variant="link" className="mt-1">
                          <Link href={"/admin/catalog/listings/new" as Route}>
                            Create your first listing
                          </Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((listing) => {
                    const meta = LISTING_STATUS_META[listing.status];
                    return (
                      <TableRow key={listing.id}>
                        <TableCell>
                          <Link
                            href={`/admin/catalog/listings/${listing.id}/edit` as Route}
                            className="font-medium text-foreground hover:underline"
                          >
                            {listing.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">{listing.slug}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{listing.category.name}</span>
                          {listing.destination ? (
                            <p className="text-xs text-muted-foreground">
                              {listing.destination.name}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPrice(listing.price, listing.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={meta.variant} className="capitalize">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dateCell(listing.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <ListingRowActions
                            listingId={listing.id}
                            status={listing.status}
                            title={listing.title}
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
