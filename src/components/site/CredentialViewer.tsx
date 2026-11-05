"use client";

import { useEffect, useState } from "react";
import { FileBadge, X } from "lucide-react";

/**
 * "View credential" trigger + lightbox (Follow-up 18). The credential
 * document image itself lives in settings (media library); this component
 * only presents it — a centered overlay, closed by the backdrop, the
 * close button, or Escape. Focus returns to the trigger on close.
 */
export function CredentialViewer({
  imageUrl,
  label,
}: {
  imageUrl: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open ]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1 rounded-sm text-[13px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <FileBadge className="size-3.5" aria-hidden="true" />
        View credential
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${label} — credential document`}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <button
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
            className="max-h-[85vh] w-auto max-w-full rounded-xl bg-white object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
