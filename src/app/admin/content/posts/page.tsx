import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Plus } from "lucide-react";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Posts</h2>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "result" : "results"}
          </p>
        </div>
        <Button asChild>
          <Link href={"/admin/content/posts/new" as Route}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New post
          </Link>
        </Button>
      </div>

      <PostFilters initialQ={q} initialStatus={status ?? ""} />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empty ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <p className="font-medium text-muted-foreground">
                        {q || status
                          ? "No posts match these filters."
                          : "No posts yet."}
                      </p>
                      {!(q || status) ? (
                        <Button asChild variant="link" className="mt-1">
                          <Link href={"/admin/content/posts/new" as Route}>
                            Create your first post
                          </Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((post) => {
                    const meta = CONTENT_STATUS_META[post.status];
                    return (
                      <TableRow key={post.id}>
                        <TableCell>
                          <Link
                            href={`/admin/content/posts/${post.id}/edit` as Route}
                            className="font-medium text-foreground hover:underline"
                          >
                            {post.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">{post.slug}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{post.category?.name ?? "—"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={meta.variant} className="capitalize">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {post.author?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dateCell(post.publishedAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dateCell(post.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <PostRowActions
                            postId={post.id}
                            status={post.status}
                            title={post.title}
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
            <Link href={page > 1 ? (`/admin/content/posts?${pageParams(-1)}` as Route) : "#"}>
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
              href={page < totalPages ? (`/admin/content/posts?${pageParams(1)}` as Route) : "#"}
            >
              Next
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
