import type { Metadata } from "next";

import { origin } from "@/lib/seo";

/**
 * Shared SEO metadata (§4): every public detail page serves a canonical URL
 * plus full Open Graph / Twitter cards. `origin()` is the single base-URL
 * truth (trailing-slash normalised), so canonicals can never disagree with
 * the sitemap.
 */
/**
 * Legacy seed suffix (FU-28): demo/seed content shipped SEO titles ending
 * in the FACTORY brand — "| TripMate", "| TripMate Bangladesh",
 * "| TripMate Travel". On a configured tenant those read as a foreign
 * brand and the root template then appended the real one, producing
 * doubled titles like "… | TripMate | FlightBlu". A trailing factory
 * suffix is seed residue, never tenant intent, so it is stripped here —
 * the single choke point every detail page's metadata flows through.
 */
const LEGACY_BRAND_SUFFIX = /\s\|\s*TripMate\b[^|]*$/;

export function finalizeDetailTitle(title: string, brand?: string): string {
  const clean = title.replace(LEGACY_BRAND_SUFFIX, "").trim();
  if (!brand) return clean;
  // An author-supplied suffix of their own ("… | Best Hajj Deals") wins
  // verbatim; otherwise the configured brand is appended HERE and the
  // title goes out absolute, so the root template can never double it.
  if (clean.includes(" | ")) return clean;
  return `${clean} | ${brand}`;
}

export function detailMetadata(opts: {
  path: string;
  title: string;
  brand?: string;
  description?: string;
  image?: { url: string; alt?: string } | null;
}): Metadata {
  const url = `${origin()}${opts.path}`;
  const finalTitle = finalizeDetailTitle(opts.title, opts.brand);
  const images = opts.image?.url ? [{ url: opts.image.url, alt: opts.image.alt ?? finalTitle }] : [];
  return {
    title: opts.brand ? { absolute: finalTitle } : finalTitle,
    ...(opts.description ? { description: opts.description } : {}),
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: finalTitle,
      ...(opts.description ? { description: opts.description } : {}),
      images,
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title: finalTitle,
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
