import "server-only";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { getPublishedPageBySlug } from "@/modules/content/service";

/**
 * Cache-tagged read for the /p/{slug} dynamic pages (about-us, faq,
 * terms-of-service, privacy-policy and any future admin-created page).
 *
 * Tag contract: page admin writes (create/edit/publish/trash) already
 * `updateTag(CACHE_TAGS.pages)` — see src/app/admin/content/pages/actions.ts —
 * so a published edit refreshes this page one cache hop later. Returns a
 * serialisable projection (Page carries Date fields the `'use cache'` boundary
 * shouldn't cross) and `null` for an unknown/unpublished slug so the caller
 * can `notFound()`.
 */

/** Serializable slice of a static page that renders /p/{slug}. */
export type StaticPageData = {
  id: string;
  title: string;
  slug: string;
  /** Sections model v1 is markdown-only; the renderer grows a branch per type
   *  as Plan 4 extends the union (see modules/content/validation.ts). */
  sections: { type: "markdown"; content: string }[];
  seoTitle: string;
  seoDescription: string;
};

export async function getStaticPageData(slug: string): Promise<StaticPageData | null> {
  "use cache";
  cacheTag(CACHE_TAGS.pages);
  cacheLife("hours");

  const page = await getPublishedPageBySlug(slug);
  if (!page) return null;

  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    sections: page.sections.map((section) => ({
      type: "markdown",
      content: section.content,
    })),
    seoTitle: page.seo?.title?.trim() ?? "",
    seoDescription: page.seo?.description?.trim() ?? "",
  };
}
