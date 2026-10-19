import type { Metadata } from "next";
import { Suspense } from "react";

import { getPublicSiteSettings } from "@/modules/settings/site-settings";
import { BlogExplorer, BlogExplorerFallback } from "./_components/BlogExplorer";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteSettings();
  const brand = site.title?.trim() || "the agency";
  return {
    title: "Journal",
    description: `${brand}'s travel journal — trip notes, destination guides and the stories behind the journeys we plan.`,
  };
}

/**
 * Blog index — /blog.
 *
 * Caching shape (Next 16 Cache Components): searchParams force the route
 * dynamic, so the page stays a thin shell and streams everything pageable
 * inside `<Suspense>`. The child (BlogExplorer) reads the `page` query string
 * OUTSIDE the cached layer, parses it into a number, and calls the `'use
 * cache'` list read keyed on that value — each `/blog?page=N` is one cache
 * entry revalidated by the CACHE_TAGS.posts contract (see _lib/blog-data.ts).
 * PPR keeps this shell (title band) static while the pageable region streams.
 */
export default async function BlogPage(props: PageProps<"/blog">) {
  const site = await getPublicSiteSettings();
  const brand = site.title?.trim() || "the agency";
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-10 lg:px-8 lg:pb-24 lg:pt-14">
      <header className="max-w-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Journal
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
          Stories from the road
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Trip notes, destination guides and the stories behind the journeys —
          written by the {brand} team.
        </p>
      </header>

      <div className="mt-10 lg:mt-12">
        <Suspense fallback={<BlogExplorerFallback />}>
          <BlogExplorer searchParams={props.searchParams} authorFallback={`${brand} Team`} />
        </Suspense>
      </div>
    </div>
  );
}
