import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { FileText, Plus } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Static & Evergreen Pages</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {shown} of {total} {total === 1 ? "page" : "pages"} configured for site navigation
          </p>
        </div>
        <Button asChild className="h-10 text-sm font-semibold gap-2 rounded-lg bg-primary text-primary-foreground">
          <Link href={"/admin/content/pages/new" as Route}>
            <Plus className="size-4" aria-hidden="true" />
            New Page
          </Link>
        </Button>
      </div>

      <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="size-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">No pages yet</h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  Create evergreen site pages like About Us, Privacy Policy, or Terms.
                </p>
                <Button asChild className="mt-5 h-10 gap-2 rounded-lg text-sm font-semibold">
                  <Link href={"/admin/content/pages/new" as Route}>
                    <Plus className="size-4" /> Create First Page
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border/80">
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5 pl-6">Title</TableHead>
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Sections</TableHead>
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Status</TableHead>
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Updated</TableHead>
                    <TableHead className="w-[100px] text-right text-[13px] font-semibold text-muted-foreground py-3.5 pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {items.map((page: Page) => {
                    const meta = CONTENT_STATUS_META[page.status];
                    return (
                      <TableRow key={page.id} className="min-h-[52px] text-sm hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3.5 pl-6">
                          <Link
                            href={`/admin/content/pages/${page.id}/edit` as Route}
                            className="font-semibold text-foreground hover:underline"
                          >
                            {page.title}
                          </Link>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">{page.slug}</p>
                        </TableCell>
                        <TableCell className="py-3.5 text-sm font-mono tabular-nums text-muted-foreground">
                          {page.sections.length}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge variant={meta.variant} className="capitalize text-xs font-medium">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 font-mono text-sm tabular-nums text-muted-foreground">
                          {dateCell(page.updatedAt)}
                        </TableCell>
                        <TableCell className="py-3.5 pr-6 text-right">
                          <PageRowActions pageId={page.id} title={page.title} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
