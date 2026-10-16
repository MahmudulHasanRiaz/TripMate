import type { Metadata } from "next";

import { origin } from "@/lib/seo";

/**
 * Shared SEO metadata (§4): every public detail page serves a canonical URL
 * plus full Open Graph / Twitter cards. `origin()` is the single base-URL
 * truth (trailing-slash normalised), so canonicals can never disagree with
 * the sitemap.
 */
export function detailMetadata(opts: {
  path: string;
  title: string;
  description?: string;
  image?: { url: string; alt?: string } | null;
}): Metadata {
  const url = `${origin()}${opts.path}`;
  const images = opts.image?.url ? [{ url: opts.image.url, alt: opts.image.alt ?? opts.title }] : [];
  return {
    title: opts.title,
    ...(opts.description ? { description: opts.description } : {}),
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: opts.title,
      ...(opts.description ? { description: opts.description } : {}),
      images,
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title: opts.title,
      ...(opts.description ? { description: opts.description } : {}),
      images: images.map((i) => i.url),
    },
  };
}

/** YouTube watch/share URL → embed URL. Null when not a YouTube link. */
export function youtubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shorts = parsed.pathname.match(/^\/shorts\/([\w-]{6,})/);
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}
