import { describe, expect, it } from "vitest";

import {
  MAX_VIDEOS,
  buildVideoObject,
  normalizeVideos,
  videoDisplayName,
  videoEmbedUrl,
  videoThumbnailUrl,
} from "@/lib/videos";
import { listingInput, destinationInput } from "@/modules/catalog/validation";
import { postInput } from "@/modules/content/validation";

// FU-35: the videos model — read normaliser (with the legacy video_url
// fallback), the validation caps, and the VideoObject JSON-LD builder.
// Pure-unit suite: lib/videos and both validation modules are import-safe
// anywhere (no DB, no server-only).

const UUID = "3f3d5b1c-0000-4000-8000-000000000001";
const YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

describe("normalizeVideos", () => {
  it("projects a stored array into clean entries (trimmed, title defaulted)", () => {
    expect(
      normalizeVideos([
        { url: `  ${YT}  `, title: "  Kaaba live  " },
        { url: "https://cdn.example.com/clip.mp4" },
      ]),
    ).toEqual([
      { url: YT, title: "Kaaba live" },
      { url: "https://cdn.example.com/clip.mp4", title: "" },
    ]);
  });

  it("drops malformed entries instead of throwing", () => {
    expect(
      normalizeVideos([
        null,
        "https://www.youtube.com/watch?v=x",
        { title: "no url" },
        { url: "   " },
        { url: 42 },
        { url: YT, title: 7 },
      ]),
    ).toEqual([{ url: YT, title: "" }]);
  });

  it("returns [] for non-array garbage", () => {
    expect(normalizeVideos(null)).toEqual([]);
    expect(normalizeVideos(undefined)).toEqual([]);
    expect(normalizeVideos({ url: YT })).toEqual([]);
    expect(normalizeVideos("nope")).toEqual([]);
  });

  it("falls back to the legacy video_url when the array is empty or absent", () => {
    expect(normalizeVideos(null, YT)).toEqual([{ url: YT, title: "" }]);
    expect(normalizeVideos([], ` ${YT} `)).toEqual([{ url: YT, title: "" }]);
    // An array of pure junk still counts as empty → fallback applies.
    expect(normalizeVideos([{ nope: true }], YT)).toEqual([{ url: YT, title: "" }]);
  });

  it("never falls back when the array has real entries", () => {
    expect(normalizeVideos([{ url: "https://vimeo.com/123456789" }], YT)).toEqual([
      { url: "https://vimeo.com/123456789", title: "" },
    ]);
  });

  it("ignores a blank legacy url", () => {
    expect(normalizeVideos(null, "   ")).toEqual([]);
    expect(normalizeVideos(null, null)).toEqual([]);
  });

  it("caps the list at MAX_VIDEOS", () => {
    const many = Array.from({ length: MAX_VIDEOS + 5 }, (_, i) => ({
      url: `https://cdn.example.com/v${i}.mp4`,
    }));
    expect(normalizeVideos(many)).toHaveLength(MAX_VIDEOS);
  });
});

describe("video URL helpers", () => {
  it("builds embed + thumbnail URLs for YouTube shapes", () => {
    expect(videoEmbedUrl(YT)).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
    expect(videoEmbedUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
    expect(videoThumbnailUrl(YT)).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });

  it("builds an embed URL for Vimeo but no keyless thumbnail", () => {
    expect(videoEmbedUrl("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
    expect(videoThumbnailUrl("https://vimeo.com/123456789")).toBeNull();
  });

  it("treats direct files as non-embeddable with no derivable thumbnail", () => {
    expect(videoEmbedUrl("https://cdn.example.com/clip.mp4")).toBeNull();
    expect(videoThumbnailUrl("https://cdn.example.com/clip.mp4")).toBeNull();
    expect(videoEmbedUrl("not a url")).toBeNull();
  });

  it("names a video by its own title, else '<entity> — video'", () => {
    expect(videoDisplayName({ url: YT, title: "Teaser" }, "Hajj 2026")).toBe("Teaser");
    expect(videoDisplayName({ url: YT, title: "  " }, "Hajj 2026")).toBe(
      "Hajj 2026 — video",
    );
  });
});

describe("buildVideoObject", () => {
  const uploadDate = new Date("2026-01-15T10:30:00.000Z");

  it("describes a YouTube video with embedUrl + derived thumbnail", () => {
    expect(
      buildVideoObject(
        { url: YT, title: "Makkah teaser" },
        { entityTitle: "Premium Hajj", uploadDate },
      ),
    ).toEqual({
      "@type": "VideoObject",
      name: "Makkah teaser",
      description: "Makkah teaser",
      thumbnailUrl: ["https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"],
      uploadDate: "2026-01-15T10:30:00.000Z",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
  });

  it("describes a direct file with contentUrl and the fallback thumbnail", () => {
    const obj = buildVideoObject(
      { url: "https://cdn.example.com/clip.mp4", title: "" },
      {
        entityTitle: "Maldives Retreat",
        uploadDate: "2026-02-01T00:00:00.000Z",
        fallbackThumbnailUrl: "/uploads/cover.jpg",
      },
    );
    expect(obj.name).toBe("Maldives Retreat — video");
    expect(obj.contentUrl).toBe("https://cdn.example.com/clip.mp4");
    expect(obj.embedUrl).toBeUndefined();
    expect(obj.thumbnailUrl).toEqual(["/uploads/cover.jpg"]);
    expect(obj.uploadDate).toBe("2026-02-01T00:00:00.000Z");
  });

  it("omits thumbnailUrl when nothing is derivable", () => {
    const obj = buildVideoObject(
      { url: "https://vimeo.com/123456789", title: "Vimeo piece" },
      { entityTitle: "Dubai", uploadDate },
    );
    expect(obj.thumbnailUrl).toBeUndefined();
    expect(obj.embedUrl).toBe("https://player.vimeo.com/video/123456789");
  });
});

describe("validation — videos caps and shapes (FU-35)", () => {
  const entries = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ url: `https://cdn.example.com/v${i}.mp4` }));

  it("listingInput accepts up to 12 videos and rejects the 13th", () => {
    const base = { title: "T", slug: "t-slug", categoryId: UUID };
    expect(listingInput.safeParse({ ...base, videos: entries(12) }).success).toBe(true);
    expect(listingInput.safeParse({ ...base, videos: entries(13) }).success).toBe(false);
  });

  it("listingInput defaults a missing video title to ''", () => {
    const res = listingInput.safeParse({
      title: "T",
      slug: "t-slug",
      categoryId: UUID,
      videos: [{ url: YT }],
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.videos).toEqual([{ url: YT, title: "" }]);
  });

  it("destinationInput accepts gallery + videos", () => {
    const res = destinationInput.safeParse({
      name: "Dubai, UAE",
      slug: "dubai",
      gallery: [{ url: "/uploads/a.jpg", alt: "Skyline" }],
      videos: [{ url: YT, title: "Dubai film" }],
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.gallery).toHaveLength(1);
      expect(res.data.videos).toEqual([{ url: YT, title: "Dubai film" }]);
    }
    expect(
      destinationInput.safeParse({ name: "D", slug: "d", videos: entries(13) }).success,
    ).toBe(false);
  });

  it("postInput caps videos and maps an empty array to null (clear semantics)", () => {
    const base = { title: "Post", slug: "post-slug" };
    expect(postInput.safeParse({ ...base, videos: entries(12) }).success).toBe(true);
    expect(postInput.safeParse({ ...base, videos: entries(13) }).success).toBe(false);
    const cleared = postInput.safeParse({ ...base, videos: [] });
    expect(cleared.success).toBe(true);
    if (cleared.success) expect(cleared.data.videos).toBeNull();
  });
});
