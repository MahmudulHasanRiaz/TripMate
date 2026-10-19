"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export type GalleryImage = {
  src: string;
  alt: string;
  caption?: string;
};

type GalleryProps = {
  images: GalleryImage[];
  className?: string;
};

/**
 * Editorial mosaic + lightbox theater (spec §4 gallery, upgraded).
 *
 * The grid adapts to the image count instead of laying every photo into one
 * uniform checkerboard: image 1 is a wide feature, images 2–3 stack tall in a
 * side column, and the tail runs as a full-width strip. When a listing has
 * more than 7 images the tail is capped at 4 and the last visible tile carries
 * a "+N more" scrim that dives straight into the lightbox at that photo — a
 * pattern borrowed from pro-travel galleries.
 *
 * The lightbox is the accessibility backbone (shadcn Dialog: focus trap, Esc,
 * aria-labels) upgraded with a thumbnail filmstrip, an active-position ring
 * that auto-scrolls into view, wrapped arrow navigation, a caption/title bar
 * and a tabular counter. Zero extra dependencies.
 */

const FEATURE_SIZES = "(min-width: 1024px) 66vw, (min-width: 640px) 50vw, 100vw";
const SIDE_SIZES = "(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 50vw";
const STRIP_SIZES = "(min-width: 1024px) 25vw, 33vw";
const THUMB_SIZES = "96px";
const STAGE_SIZES = "90vw";

/** Cap so galleries of any size stay composed instead of sprawling. */
const MAX_SIDE = 2;
const MAX_STRIP = 4;

export function Gallery({ images, className }: GalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const count = images.length;

  const step = useCallback(
    (dir: 1 | -1) => {
      if (count === 0) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
  };

  if (count === 0) return null;

  const feature = images[0];
  const side = images.slice(1, 1 + MAX_SIDE);
  const stripPool = images.slice(1 + MAX_SIDE);
  const strip = stripPool.slice(0, MAX_STRIP);
  const hiddenCount = count - (1 + side.length + strip.length);
  const lastVisibleIndex = 1 + side.length + strip.length - 1;

  const tile = (image: GalleryImage, i: number, extra?: { sizes?: string; className?: string }) => (
    <MosaicTile
      key={image.src}
      image={image}
      index={i}
      total={count}
      onOpen={() => {
        setIndex(i);
        setOpen(true);
      }}
      overlayCount={i === lastVisibleIndex && hiddenCount > 0 ? hiddenCount : 0}
      sizes={extra?.sizes ?? SIDE_SIZES}
      className={extra?.className}
    />
  );

  return (
    <>
      <div className={cn("grid gap-2.5 sm:gap-3", className)} data-testid="package-gallery-grid">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-[1.65fr_1fr] lg:gap-3">
          <div className={cn("col-span-2", side.length > 0 && "lg:col-span-1")}>
            {tile(feature, 0, {
              sizes: FEATURE_SIZES,
              className: "aspect-[16/9] lg:aspect-[16/10]",
            })}
          </div>
          {side.length > 0 ? (
            <div className="col-span-2 grid grid-cols-2 gap-2.5 sm:gap-3 lg:col-span-1 lg:grid-cols-1 lg:gap-3">
              {side.map((image, i) =>
                tile(image, i + 1, {
                  // Odd side counts would leave a ragged hole on the 2-col
                  // mobile grid — the last tile fills the whole row.
                  className:
                    side.length % 2 === 1 && i === side.length - 1
                      ? "col-span-2 lg:col-span-1"
                      : undefined,
                }),
              )}
            </div>
          ) : null}
        </div>

        {strip.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {strip.map((image, i) =>
              tile(image, i + 1 + side.length, {
                sizes: STRIP_SIZES,
                // The tail row closes the mosaic: every strip length composes
                // to exactly one tidy row on both breakpoints.
                className: stripSpanClass(i, strip.length),
              }),
            )}
          </div>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onKeyDown={onKeyDown}
          className="max-w-6xl gap-0 overflow-hidden p-0 sm:rounded-xl"
        >
          <div className="flex items-center gap-4 border-b border-border px-12 py-3.5">
            <DialogTitle className="truncate text-base font-semibold">
              {currentCaption(images, index)}
            </DialogTitle>
            <span className="ml-auto shrink-0 text-sm tabular-nums text-muted-foreground">
              {index + 1} / {count}
            </span>
          </div>

          <div className="relative h-[58vh] w-full bg-black sm:h-[64vh]">
            {images[index] ? (
              <div
                key={images[index].src}
                className="animate-in fade-in-50 absolute inset-0 duration-200"
              >
                <Image
                  src={images[index].src}
                  alt={images[index].alt}
                  fill
                  sizes={STAGE_SIZES}
                  className="object-contain"
                />
              </div>
            ) : null}

            {count > 1 ? (
              <>
                <LightboxNav dir="prev" onClick={() => step(-1)} />
                <LightboxNav dir="next" onClick={() => step(1)} />
              </>
            ) : null}
          </div>

          {count > 1 ? (
            <Filmstrip
              images={images}
              index={index}
              onSelect={(i) => setIndex(i)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function currentCaption(images: GalleryImage[], index: number): string {
  const current = images[index];
  if (!current) return "";
  return current.caption || current.alt;
}

/**
 * Span classes that close the tail row for any strip length
 * (1 → one wide banner; 2 → halves; 3 → feature + pair; 4 → even four-up)
 * so the mosaic always lands on a clean row on mobile AND desktop.
 */
function stripSpanClass(i: number, len: number): string | undefined {
  if (len === 1) return "col-span-2 lg:col-span-4";
  if (len === 2) return "lg:col-span-2";
  if (len === 3) {
    if (i === 0) return "lg:col-span-2";
    if (i === 2) return "col-span-2 lg:col-span-1";
    return undefined;
  }
  return undefined;
}

/**
 * One interactive mosaic cell. `total` only feeds the aria-label; the hover
 * gradient invites, and the "+N more" overlay (when present) is the crash-gate
 * into the theater for oversized galleries.
 */
function MosaicTile({
  image,
  index,
  total,
  onOpen,
  overlayCount = 0,
  sizes,
  className,
}: {
  image: GalleryImage;
  index: number;
  total: number;
  onOpen: () => void;
  overlayCount?: number;
  sizes: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${image.caption || image.alt} — open image ${index + 1} of ${total}${
        overlayCount > 0 ? ` (plus ${overlayCount} more)` : ""
      }`}
      className={cn(
        "group relative block w-full cursor-pointer overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "aspect-[4/3] transition-shadow duration-300 hover:shadow-lg hover:shadow-black/20",
        className,
      )}
    >
      <Image
        src={image.src}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
      />
      {overlayCount > 0 ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 z-10 flex items-center justify-center gap-1.5 bg-black/60 text-base font-semibold text-white backdrop-blur-[2px] transition-colors group-hover:bg-black/70"
        >
          <Plus className="size-5" aria-hidden="true" />
          {overlayCount} more
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}
    </button>
  );
}

/** Round translucent prev/next control, vertically centered in the stage. */
function LightboxNav({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  const position = dir === "prev" ? "left-3" : "right-3";
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous image" : "Next image"}
      className={`absolute ${position} top-1/2 z-10 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-lg transition-transform hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      data-testid={`lightbox-${dir}`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

/** Thumbnail rail under the stage; the active thumb auto-scrolls into view. */
function Filmstrip({
  images,
  index,
  onSelect,
}: {
  images: GalleryImage[];
  index: number;
  onSelect: (i: number) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    rail
      .querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [index]);

  return (
    <div
      ref={railRef}
      className="flex gap-2 overflow-x-auto border-t border-border bg-background p-3"
      role="listbox"
      aria-label="Gallery thumbnails"
    >
      {images.map((image, i) => {
        const active = i === index;
        return (
          <button
            key={image.src}
            type="button"
            role="option"
            aria-current={active || undefined}
            aria-selected={active}
            aria-label={`Show image ${i + 1} of ${images.length}: ${image.caption || image.alt}`}
            onClick={() => onSelect(i)}
            className={cn(
              "relative h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                : "opacity-55 ring-1 ring-transparent hover:opacity-90",
            )}
          >
            <Image
              src={image.src}
              alt=""
              fill
              sizes={THUMB_SIZES}
              className="object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}
