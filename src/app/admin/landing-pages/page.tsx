import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Plus } from "lucide-react";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">All Landing Pages</h2>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "page" : "pages"} total
          </p>
        </div>
        <Button asChild>
          <Link href={"/admin/landing-pages/new" as Route}>
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            New landing page
          </Link>
        </Button>
      </div>

      <LandingFilters initialSearch={search} initialStatus={status ?? ""} />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title &amp; Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>FB Content ID</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      No landing pages found. Click &ldquo;New landing page&rdquo; to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-xs">
                        <Link
                          href={`/admin/landing-pages/${item.id}/edit` as Route}
                          className="font-medium text-foreground hover:underline"
                        >
                          {item.title}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          <span>/l/{item.slug}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === "published" ? "success" : "secondary"}
                          className="capitalize text-xs"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {item.fbContentId ? item.fbContentId : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dateCell(item.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <LandingRowActions
                          id={item.id}
                          slug={item.slug}
                          status={item.status}
                          title={item.title}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={`/admin/landing-pages?${pageParams(-1)}` as Route}>Previous</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={`/admin/landing-pages?${pageParams(1)}` as Route}>Next</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
