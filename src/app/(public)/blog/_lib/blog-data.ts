import "server-only";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getPublishedPostBySlug,
  listPublishedPosts,
  type PostWithRefs,
} from "@/modules/content/service";

/**
 * Cache-tagged reads for the /blog routes.
 *
 * Same contract as the packages catalog-data module: the content SERVICE
 * functions stay plain, and this module is where a public route decides
 * "cache this DB read, tag it with the posts contract, hours profile". Every
 * function is a `'use cache'` scope keyed by its serialisable arguments, so:
 *
 *   - the index is cached PER PAGE (each `/blog?page=N` is one cache entry);
 *   - the detail is cached per slug and additionally tagged with the post slug
 *     after the row resolves so a targeted admin publish/edit revalidates it.
 *
 * All admin content mutations already `updateTag(CACHE_TAGS.posts)` — from both
 * the post and post-category action modules — so the tag contract refreshes
 * exactly the affected entries. Return values are plain projections: no Date
 * objects, no class instances across the `'use cache'` boundary.
 */

export const BLOG_PER_PAGE = 9;

/** Serializable slice of a post that renders a BlogCard on the index. */
export type BlogCardData = {
  id: string;
  title: string;
  slug: string;
  image: { url: string; alt: string } | null;
  /** ISO date of first publication (public reads guarantee publishedAt). */
  date: string;
  author: string;
  excerpt: string;
};

/** Serializable slice of a post that renders the article page. */
export type BlogPostData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  /** Raw markdown body — rendered (sanitized) server-side via ProseMarkdown. */
  content: string;
  image: { url: string; alt: string } | null;
  gallery: { url: string; alt: string }[];
  videoUrl: string | null;
  author: string;
  category: string | null;
  /** ISO date of first publication. */
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
};

export type BlogListData = {
  items: BlogCardData[];
  total: number;
  /** Effective 1-based page (clamped when `page` overshoots the last page). */
  page: number;
  totalPages: number;
};

function toCardData(post: PostWithRefs, authorFallback: string): BlogCardData {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    image: post.featuredImage
      ? { url: post.featuredImage.url, alt: post.featuredImage.alt ?? post.title }
      : null,
    date: (post.publishedAt ?? post.createdAt).toISOString(),
    author: post.author?.name ?? authorFallback,
    excerpt: post.excerpt ?? "",
  };
}

export async function getBlogIndexData(
  page: number,
  authorFallback = "",
): Promise<BlogListData> {
  "use cache";
  cacheTag(CACHE_TAGS.posts);
  cacheLife("minutes");

  let result = await listPublishedPosts({ page, perPage: BLOG_PER_PAGE });
  const totalPages = result.total === 0 ? 1 : Math.ceil(result.total / BLOG_PER_PAGE);

  // Hand-typed `?page=999` URLs can overshoot the last page; clamp to the last
  // page once rather than render an empty "no posts" state for a page that does
  // not exist (same correctness clamp as the packages index).
  if (result.items.length === 0 && result.total > 0 && page > totalPages) {
    result = await listPublishedPosts({ page: totalPages, perPage: BLOG_PER_PAGE });
  }
  const effectivePage = Math.min(page, totalPages);

  return {
    items: result.items.map((post) => toCardData(post, authorFallback)),
    total: result.total,
    page: effectivePage,
    totalPages,
  };
}

export async function getBlogPostData(
  slug: string,
  authorFallback = "",
): Promise<BlogPostData | null> {
  "use cache";
  cacheTag(CACHE_TAGS.posts);
  cacheLife("minutes");

  const post = await getPublishedPostBySlug(slug);
  if (!post) return null;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content ?? "",
    image: post.featuredImage
      ? { url: post.featuredImage.url, alt: post.featuredImage.alt ?? post.title }
      : null,
    gallery: post.gallery.map((g) => ({ url: g.url, alt: g.alt ?? post.title })),
    videoUrl: post.videoUrl,
    author: post.author?.name ?? authorFallback,
    category: post.category?.name ?? null,
    publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
    seoTitle: post.seo?.title?.trim() ?? "",
    seoDescription: post.seo?.description?.trim() ?? "",
  };
}
