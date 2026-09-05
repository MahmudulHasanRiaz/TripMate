"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

const GRID_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/**
 * Image grid + lightbox (spec §4 gallery template). The shadcn Dialog is the
 * accessibility backbone: it moves focus in, traps it, and closes on Esc; the
 * arrows wrap and the counter keeps context for screen readers.
 */
export function Gallery({ images, className }: GalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const current = images[index] ?? images[0];
  const count = images.length;

  const step = useCallback(
    (dir: 1 | -1) => {
      if (count === 0) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    },
    [step],
  );

  if (count === 0) return null;

  return (
    <>
      <ul
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
          className,
        )}
      >
        {images.map((image, i) => (
          <li key={image.src} className="relative">
            <button
              type="button"
              onClick={() => {
                setIndex(i);
                setOpen(true);
              }}
              aria-label={`View ${image.alt}, image ${i + 1} of ${count}`}
              className="group block aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Image
                src={image.src}
                alt=""
                fill
                sizes={GRID_SIZES}
                className="object-cover transition-transform duration-300 ease-out-quint group-hover:scale-[1.02]"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onKeyDown={onKeyDown}
          className="max-w-5xl gap-0 overflow-hidden p-0 sm:rounded-xl"
        >
          <div className="flex items-center gap-4 border-b border-border px-12 py-4">
            <DialogTitle className="truncate text-base font-semibold">
              {current.caption ?? current.alt}
            </DialogTitle>
            <span className="ml-auto shrink-0 text-sm tabular-nums text-muted-foreground">
              {count > 0 ? `${index + 1} / ${count}` : ""}
            </span>
          </div>

          <div className="relative h-[62vh] w-full bg-muted/40">
            {current ? (
              <Image
                src={current.src}
                alt={current.alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            ) : null}

            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
