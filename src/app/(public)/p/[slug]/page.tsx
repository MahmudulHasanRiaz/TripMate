import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { getStaticPageData } from "../_lib/page-data";

/**
 * Legacy static page — /p/[slug] (§2.3).
 *
 * Evergreen pages moved to root /{slug}. This route now 301-redirects
 * (permanentRedirect) to preserve backlinks and search equity.
 */

export async function generateMetadata(
  props: PageProps<"/p/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getStaticPageData(slug);
  if (!data) return { title: "Page not found" };
  return {
    title: data.seoTitle || data.title,
    ...(data.seoDescription ? { description: data.seoDescription } : {}),
  };
}

export default async function LegacyStaticPage(
  props: PageProps<"/p/[slug]">,
) {
  const { slug } = await props.params;
  const data = await getStaticPageData(slug);
  if (!data) notFound();
  permanentRedirect(`/${slug}`);
}
