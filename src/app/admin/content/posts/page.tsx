import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { FileText, Plus } from "lucide-react";
import { listAllPosts } from "@/modules/content/service";
import { contentStatusSchema } from "@/modules/content/validation";
import type { ContentStatus } from "@/modules/content/validation";
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
import PostFilters from "./PostFilters";
import PostRowActions from "./PostRowActions";

export const metadata: Metadata = { title: "Posts · Content" };

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

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const statusRaw = typeof sp.status === "string" ? sp.status : "";
  const status: ContentStatus | undefined = contentStatusSchema.safeParse(statusRaw).success
    ? (statusRaw as ContentStatus)
    : undefined;
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const { items, total } = await listAllPosts({
    search: q || undefined,
    status,
    page,
    perPage: PER_PAGE,
  });

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Blog & Articles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage published travel stories, visa guides, and customer announcements.
          </p>
        </div>
        <Button asChild className="h-10 text-sm font-semibold gap-2 rounded-lg bg-primary text-primary-foreground">
          <Link href={"/admin/content/posts/new" as Route}>
            <Plus className="size-4" aria-hidden="true" />
            New Post
          </Link>
        </Button>
      </div>

      <PostFilters initialQ={q} initialStatus={status ?? ""} />

      <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {empty ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="size-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">No posts found</h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  {q || status
                    ? "No posts match the applied filters. Try a different query."
                    : "No blog posts or travel articles created yet."}
                </p>
                {q || status ? (
                  <Button asChild variant="outline" className="mt-5 h-9 rounded-lg text-sm font-semibold">
                    <Link href={"/admin/content/posts" as Route}>
                      Clear Filters
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="mt-5 h-10 gap-2 rounded-lg text-sm font-semibold">
                    <Link href={"/admin/content/posts/new" as Route}>
                      <Plus className="size-4" /> Create First Post
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border/80">
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5 pl-6">Title</TableHead>
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Category</TableHead>
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Status</TableHead>
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Author</TableHead>
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Published</TableHead>
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Updated</TableHead>
                    <TableHead className="w-[100px] text-right text-[13px] font-semibold text-muted-foreground py-3.5 pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {items.map((post) => {
                    const meta = CONTENT_STATUS_META[post.status];
                    return (
                      <TableRow key={post.id} className="min-h-[52px] text-sm hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3.5 pl-6">
                          <Link
                            href={`/admin/content/posts/${post.id}/edit` as Route}
                            className="font-semibold text-foreground hover:underline"
                          >
                            {post.title}
                          </Link>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">{post.slug}</p>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-sm font-medium">{post.category?.name ?? "—"}</span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge variant={meta.variant} className="capitalize text-xs font-medium">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 text-sm text-muted-foreground">
                          {post.author?.name ?? "—"}
                        </TableCell>
                        <TableCell className="py-3.5 font-mono text-sm tabular-nums text-muted-foreground">
                          {dateCell(post.publishedAt)}
                        </TableCell>
                        <TableCell className="py-3.5 font-mono text-sm tabular-nums text-muted-foreground">
                          {dateCell(post.updatedAt)}
                        </TableCell>
                        <TableCell className="py-3.5 pr-6 text-right">
                          <PostRowActions
                            postId={post.id}
                            status={post.status}
                            title={post.title}
                            slug={post.slug}
                            initialSeo={post.seo}
                          />
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

      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
          <div>
            Showing <span className="font-semibold tabular-nums text-foreground">{items.length}</span> of{" "}
            <span className="font-semibold tabular-nums text-foreground">{total}</span> posts
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className={`h-9 gap-1 text-sm rounded-lg font-medium ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              <Link href={page > 1 ? (`/admin/content/posts?${pageParams(-1)}` as Route) : "#"}>
                Previous
              </Link>
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
              <Link
                href={page < totalPages ? (`/admin/content/posts?${pageParams(1)}` as Route) : "#"}
              >
                Next
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
