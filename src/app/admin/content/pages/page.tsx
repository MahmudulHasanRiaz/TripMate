import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Plus } from "lucide-react";
import { listAllPages } from "@/modules/content/service";
import type { Page } from "@/modules/content/service";
import { CONTENT_STATUS_META } from "@/modules/content/status-meta";
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
import PageRowActions from "./PageRowActions";

export const metadata: Metadata = { title: "Pages · Content" };

// Fresh, per-request DB reads behind an auth gate — no static shell to serve.
export const instant = false;

function dateCell(value: Date): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PagesPage() {
  const { items, total } = await listAllPages({ perPage: 100 });

  // The list renders at most `perPage` rows with no pager; the header count is
  // clamped to what is actually shown (never a DB total the table can't reach).
  const shown = Math.min(total, items.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Pages</h2>
          <p className="text-sm text-muted-foreground">
            {shown} of {total} {total === 1 ? "page" : "pages"} shown
          </p>
        </div>
        <Button asChild>
          <Link href={"/admin/content/pages/new" as Route}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New page
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Sections</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <p className="font-medium text-muted-foreground">No pages yet.</p>
                      <Button asChild variant="link" className="mt-1">
                        <Link href={"/admin/content/pages/new" as Route}>
                          Create your first page
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((page: Page) => {
                    const meta = CONTENT_STATUS_META[page.status];
                    return (
                      <TableRow key={page.id}>
                        <TableCell>
                          <Link
                            href={`/admin/content/pages/${page.id}/edit` as Route}
                            className="font-medium text-foreground hover:underline"
                          >
                            {page.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">{page.slug}</p>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {page.sections.length}
                        </TableCell>
                        <TableCell>
                          <Badge variant={meta.variant} className="capitalize">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dateCell(page.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <PageRowActions pageId={page.id} title={page.title} />
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
    </div>
  );
}
