"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  videoAutoplayEmbedUrl,
  videoDisplayName,
  videoEmbedUrl,
  videoThumbnailUrl,
  type VideoEntry,
} from "@/lib/videos";

type VideoGalleryProps = {
  videos: VideoEntry[];
  /** Entity title — the display-name fallback for untitled videos. */
  title: string;
  className?: string;
};

/**
 * Shared "Watch" player for package / post / destination detail pages
 * (FU-35), in the Gallery lightbox's visual language (card shell, caption
 * bar with tabular counter, thumbnail rail).
 *
 * Facade pattern: NO iframe exists in the DOM until the visitor clicks the
 * poster — the stage starts as a plain thumbnail <img> (YouTube still) or a
 * branded gradient, so a page with videos pays zero embed cost up front.
 * Clicking swaps in the autoplay embed for embeddable sources (YouTube /
 * Vimeo); direct video files never needed an iframe and render a native
 * <video> with controls instead. With 2+ videos the rail under the stage
 * switches the active video (and resets the facade); on mobile that same
 * snap-scroll rail is the swipe row.
 *
 * Thumbnails render through a plain <img>, not next/image: img.youtube.com
 * is not in next.config's remotePatterns.
 */
export function VideoGallery({ videos, title, className }: VideoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activated, setActivated] = useState(false);

  const count = videos.length;
  if (count === 0) return null;

  const index = Math.min(activeIndex, count - 1);
  const active = videos[index];
  const name = videoDisplayName(active, title);
  const embed = videoEmbedUrl(active.url);
  const thumbnail = videoThumbnailUrl(active.url);

  const select = (i: number) => {
    setActiveIndex(i);
    // A different video starts behind its own facade — never autoplay a
    // video the visitor only thumbed past.
    setActivated(false);
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="relative aspect-video w-full bg-black">
        {embed ? (
          activated ? (
            <iframe
              src={videoAutoplayEmbedUrl(active.url) ?? embed}
              title={name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => setActivated(true)}
              aria-label={`Play video: ${name}`}
              className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail host (img.youtube.com) is not in next/image remotePatterns
                <img
                  src={thumbnail}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-br from-primary/30 via-slate-950 to-slate-900"
                />
              )}
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="flex size-16 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-transform duration-200 group-hover:scale-110">
                  <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
                </span>
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-10 text-left"
              >
                <span className="block truncate text-sm font-medium text-white">{name}</span>
              </span>
            </button>
          )
        ) : (
          <video
            key={active.url}
            src={active.url}
            controls
            preload="metadata"
            title={name}
            className="absolute inset-0 h-full w-full bg-black"
          >
            Your browser cannot play this video.
          </video>
        )}
      </div>

      <div className="flex items-center gap-4 px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>
        {count > 1 ? (
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {index + 1} / {count}
          </span>
        ) : null}
      </div>

      {count > 1 ? (
        <div
          className="flex snap-x gap-2 overflow-x-auto border-t border-border bg-background p-3"
          role="listbox"
          aria-label="Videos"
        >
          {videos.map((video, i) => {
            const videoName = videoDisplayName(video, title);
            const thumb = videoThumbnailUrl(video.url);
            const isActive = i === index;
            return (
              <button
                key={`${video.url}-${i}`}
                type="button"
                role="option"
                aria-current={isActive || undefined}
                aria-selected={isActive}
                aria-label={`Show video ${i + 1}: ${videoName}`}
                onClick={() => select(i)}
                className={cn(
                  "relative aspect-video w-40 shrink-0 snap-start cursor-pointer overflow-hidden rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    : "opacity-55 hover:opacity-90",
                )}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail host (img.youtube.com) is not in next/image remotePatterns
                  <img
                    src={thumb}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Play className="size-6 text-muted-foreground" aria-hidden="true" />
                    <span className="sr-only">{videoName}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
