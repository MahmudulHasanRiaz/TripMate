"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, FileBadge, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * "View credential" trigger + lightbox (Follow-up 18; portal fix in
 * Follow-up 19). The credential document image itself lives in settings
 * (media library); this component only presents it.
 *
 * The overlay renders through a portal to <body>: the band sits inside
 * scroll-reveal wrappers whose transforms turn `position: fixed` into
 * "fixed within the wrapper", which stranded the dialog at the bottom of
 * the page on mobile. Portalling out makes the viewport the containing
 * block again, unconditionally. Closed by the backdrop, the close button,
 * or Escape; focus moves to the close button on open and returns to the
 * trigger on close.
 */
export function CredentialViewer({
  imageUrl,
  label,
  iconOnly = false,
  triggerClassName,
}: {
  imageUrl: string;
  label: string;
  /** Corner eye-icon trigger instead of the text link (FU-24). */
  iconOnly?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open ]);

  return (
    <>
      {iconOnly ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`View credential — ${label}`}
          title="View credential"
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition-all duration-200 hover:scale-105 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            triggerClassName,
          )}
        >
          <Eye className="size-4" aria-hidden="true" />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center gap-1 rounded-sm text-[13px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <FileBadge className="size-3.5" aria-hidden="true" />
          View credential
        </button>
      )}
      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${label} — credential document`}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            >
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close credential view"
                className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`${label} — credential document`}
                className="max-h-[85dvh] w-auto max-w-full rounded-xl bg-white object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
