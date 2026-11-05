/**
 * Shared video model (FU-35): the ONE place that knows how a stored
 * `{ url, title }` video entry is normalised, embedded, thumbnailed and
 * described to search engines.
 *
 * Storage (since FU-35): listings, posts and destinations carry a `videos`
 * jsonb array of `{ url, title }`. Listings/posts ALSO keep their legacy
 * single `video_url` text column for one release as read-compat insurance:
 * `normalizeVideos` falls back to it whenever the array is empty, so a client
 * database that predates the migration keeps rendering its video untouched
 * (owner rule: deploys auto-align with existing data, never break a flow).
 * Writes only ever touch `videos` (and clear the legacy column when they do),
 * so a video the admin removes can never resurrect through the fallback.
 *
 * Pure module — no server-only imports — so services, public pages, admin
 * forms and tests all share these exact rules.
 */

export type VideoEntry = {
  url: string;
  title: string;
};

/** Admin + validation cap: a detail page is a showcase, not a playlist. */
export const MAX_VIDEOS = 12;

/**
 * Defensive projection of a raw jsonb cell (+ optional legacy single-URL
 * fallback) into clean entries. Anything malformed is dropped, never thrown:
 * a corrupt cell degrades to "no videos" instead of breaking a public page.
 */
export function normalizeVideos(
  value: unknown,
  legacyVideoUrl?: string | null,
): VideoEntry[] {
  const videos: VideoEntry[] = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (videos.length >= MAX_VIDEOS) break;
      if (entry === null || typeof entry !== "object") continue;
      const url = (entry as { url?: unknown }).url;
      if (typeof url !== "string" || url.trim().length === 0) continue;
      const title = (entry as { title?: unknown }).title;
      videos.push({
        url: url.trim(),
        title: typeof title === "string" ? title.trim() : "",
      });
    }
  }
  if (videos.length === 0 && typeof legacyVideoUrl === "string" && legacyVideoUrl.trim()) {
    return [{ url: legacyVideoUrl.trim(), title: "" }];
  }
  return videos;
}

/** YouTube video id from watch / share / shorts / embed URLs, else null. */
export function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return id;
      const path = parsed.pathname.match(/^\/(?:shorts|embed|v)\/([\w-]{6,})/);
      if (path) return path[1];
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (id) return id;
    }
    return null;
  } catch {
    return null;
  }
}

/** Vimeo video id from a vimeo.com/<id> URL, else null. */
export function vimeoVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
    const match = parsed.pathname.match(/(?:\/video)?\/(\d{6,})/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Embeddable player URL for iframe rendering, or null when the URL is not a
 * recognised embed host — callers then treat it as a direct video file and
 * render a native <video> element (the pre-FU-35 behaviour for mp4 links).
 */
export function videoEmbedUrl(url: string): string | null {
  const yt = youtubeVideoId(url);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vm = vimeoVideoId(url);
  if (vm) return `https://player.vimeo.com/video/${vm}`;
  return null;
}

/** The embed URL with autoplay requested (used after a facade click). */
export function videoAutoplayEmbedUrl(url: string): string | null {
  const embed = videoEmbedUrl(url);
  if (!embed) return null;
  return `${embed}${embed.includes("?") ? "&" : "?"}autoplay=1`;
}

/**
 * Poster/thumbnail derivable WITHOUT an API call. YouTube serves a stable
 * hqdefault still per video; Vimeo and direct files expose nothing keyless,
 * so they return null and the facade renders its branded placeholder.
 */
export function videoThumbnailUrl(url: string): string | null {
  const yt = youtubeVideoId(url);
  return yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : null;
}

/** Display name for a video: its own title, else "<entity> — video". */
export function videoDisplayName(video: VideoEntry, entityTitle: string): string {
  const own = video.title.trim();
  return own || `${entityTitle} — video`;
}

/**
 * schema.org VideoObject for one video on an entity detail page. Follows the
 * codebase's JSON-LD convention (@graph members emitted via <JsonLd>):
 * embeddable sources advertise `embedUrl`, direct files `contentUrl`;
 * `thumbnailUrl` appears only when a still is derivable (the caller's
 * fallback — usually the entity cover — wins over nothing at all).
 */
export function buildVideoObject(
  video: VideoEntry,
  opts: {
    entityTitle: string;
    uploadDate: string | Date;
    fallbackThumbnailUrl?: string | null;
  },
): Record<string, unknown> {
  const name = videoDisplayName(video, opts.entityTitle);
  const embed = videoEmbedUrl(video.url);
  const thumbnail = videoThumbnailUrl(video.url) ?? opts.fallbackThumbnailUrl ?? null;
  const uploadDate =
    opts.uploadDate instanceof Date
      ? opts.uploadDate.toISOString()
      : new Date(opts.uploadDate).toISOString();
  return {
    "@type": "VideoObject",
    name,
    description: name,
    ...(thumbnail ? { thumbnailUrl: [thumbnail] } : {}),
    uploadDate,
    ...(embed ? { embedUrl: embed } : { contentUrl: video.url }),
  };
}
