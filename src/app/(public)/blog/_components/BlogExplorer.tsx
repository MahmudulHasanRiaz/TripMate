import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";

import { BlogCard } from "@/components/site/BlogCard";
import { paginationPageList } from "@/lib/pagination";
import { cn } from "@/lib/utils";

import { BLOG_PER_PAGE, getBlogIndexData } from "../_lib/blog-data";

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;

/**
 * Streamed core of /blog.
 *
 * The page renders this inside `<Suspense>` so the URL query string is read
 * here — not in the cached layer — and the per-page grid below is the
 * documented equivalent of a "grid cached per page-key": the `page` param is
 * parsed defensively into a number, that number keys the `'use cache'` list
 * read in blog-data, and whatever page is current becomes one cached entry
 * revalidated by the posts tag. No search/category filter in v1 (per Task 12
 * brief) — just chronological pagination.
 */
export async function BlogExplorer({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = positiveInt(first(params.page), 1);
  const result = await getBlogIndexData(page);

  return (
    <>
      {result.total > 0 ? (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {result.total} {result.total === 1 ? "post" : "posts"}
            {result.page > 1 ? ` · page ${result.page} of ${result.totalPages}` : ""}
          </p>
          <div
            data-testid="blog-grid"
            className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
          >
            {result.items.map((post) => (
              <BlogCard
                key={post.id}
                href={`/blog/${post.slug}`}
                title={post.title}
                imageSrc={post.image?.url ?? ""}
                imageAlt={post.image?.alt ?? post.title}
                date={post.date}
                author={post.author}
                excerpt={post.excerpt}
              />
            ))}
          </div>
          {result.totalPages > 1 ? (
            <BlogPagination page={result.page} totalPages={result.totalPages} />
          ) : null}
        </>
      ) : (
        <BlogEmptyState />
      )}
    </>
  );
}

/** Parse an integer >= 1; anything else yields the fallback. */
function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : fallback;
}

function first(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? (raw[0] ?? undefined) : raw;
}

/** Graceful empty state — the seed ships no posts, so this is the launch view. */
function BlogEmptyState() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Newspaper className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
        Stories are being written
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Travel stories, guides and inspiration are on the way — check back soon,
        or browse our packages in the meantime.
      </p>
      <Link
        href="/packages"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
      >
        Browse packages
      </Link>
    </div>
  );
}

function BlogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const hrefFor = (target: number) => (target > 1 ? `/blog?page=${target}` : "/blog");

  const pageLinkClass =
    "inline-flex size-11 items-center justify-center rounded-md text-sm font-medium transition-colors duration-150";
  const idleLink = cn(pageLinkClass, "border border-border text-foreground hover:border-foreground/40");
  const current = cn(pageLinkClass, "bg-primary font-semibold text-primary-foreground");
  const disabled = cn(
    pageLinkClass,
    "cursor-default border border-border text-muted-foreground/50",
  );

  const navLink = (target: number | null, label: string, icon: ReactNode) =>
    target === null ? (
      <span className={disabled} aria-disabled="true">
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    ) : (
      <Link
        href={hrefFor(target) as Route}
        aria-label={label}
        className={cn(idleLink, "hover:border-foreground/40")}
      >
        {icon}
        <span className="sr-only">{label}</span>
      </Link>
    );

  return (
    <nav aria-label="Journal pages" className="mt-10 flex items-center justify-center gap-1.5">
      {navLink(page > 1 ? page - 1 : null, "Previous page", (
        <ChevronLeft className="size-4" aria-hidden="true" />
      ))}
      {paginationPageList(page, totalPages).map((entry, i) =>
        entry === "gap" ? (
          <span
            key={`gap-${i}`}
            className="inline-flex size-11 items-center justify-center text-sm text-muted-foreground"
          >
            …
          </span>
        ) : entry === page ? (
          <span key={entry} className={current} aria-current="page">
            {entry}
          </span>
        ) : (
          <Link key={entry} href={hrefFor(entry) as Route} className={idleLink}>
            {entry}
          </Link>
        ),
      )}
      {navLink(page < totalPages ? page + 1 : null, "Next page", (
        <ChevronRight className="size-4" aria-hidden="true" />
      ))}
    </nav>
  );
}

/**
 * Suspense fallback for the explorer: a quiet, aria-hidden mirror of the grid so
 * the streamed content does not pop in cold.
 */
export function BlogExplorerFallback() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {Array.from({ length: BLOG_PER_PAGE }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="aspect-[3/2] animate-pulse bg-muted/80" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted/80" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted/80" />
              <div className="h-4 w-full animate-pulse rounded bg-muted/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
