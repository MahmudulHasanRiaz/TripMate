"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

import type { SiteAccreditation } from "@/lib/site-settings";
import { CredentialViewer } from "./CredentialViewer";
import { cn } from "@/lib/utils";

/**
 * Accreditations track (Follow-up 20, from the second designer review).
 *
 * Mobile (<sm): a horizontal swipe carousel — native scroll-snap, one
 * card at ~84% width so the next card peeks in and the swipe affords
 * itself, pagination dots + a "1 / 5" counter + prev/next buttons below.
 * No auto-rotation. Tablet (sm): the 2-column grid. Desktop (lg): the
 * 3-column grid with the balanced final row (count % 3 == 2 → the last
 * two cards span wider). Cards are compact on mobile (64px plate,
 * 15px title) and keep the premium desktop spec (88px plate, 17px).
 *
 * Optional credential text/image/link render only when configured —
 * blank stays invisible (standing rule).
 */
export function AccreditationsShowcase({
  badges,
}: {
  badges: SiteAccreditation[];
}) {
  const trackRef = useRef<HTMLUListElement | null>(null);
  const [active, setActive] = useState(0);
  const count = badges.length;

  const indexFromScroll = () => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return;
    const step = first.offsetWidth + 12; // card width + gap-3
    const idx = Math.round(track.scrollLeft / step);
    setActive(Math.max(0, Math.min(count - 1, idx)));
  };

  const goTo = (i: number) => {
    const track = trackRef.current;
    const child = track?.children[i] as HTMLElement | undefined;
    if (!track || !child) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    track.scrollTo({
      left: child.offsetLeft - 4,
      behavior: reduced ? "auto" : "smooth",
    });
    setActive(i);
  };

  return (
    <div>
      <ul
        ref={trackRef}
        onScroll={indexFromScroll}
        aria-label="Accreditations and licences"
        className="relative mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:p-0 lg:grid-cols-6"
      >
        {badges.map((badge, i) => {
          // Balance a final partial row on desktop: when the count
          // leaves 2 cards over (5, 8, …), the last two span wider so
          // the row stays symmetric instead of stranding one card.
          const balanced = count % 3 === 2 && i >= count - 2;
          const external = /^https?:\/\//i.test(badge.linkUrl);
          return (
            <li
              key={`${badge.label}-${i}`}
              className={cn(
                "w-[84%] shrink-0 snap-start sm:w-auto sm:shrink",
                balanced ? "lg:col-span-3" : "lg:col-span-2",
              )}
            >
              <div className="flex h-full flex-col items-center rounded-2xl border border-border bg-card p-4 text-center transition duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 sm:p-5">
                <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-border/70 sm:size-[88px]">
                  {badge.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={badge.imageUrl}
                      alt=""
                      className="max-h-10 w-auto max-w-[52px] object-contain sm:max-h-14 sm:max-w-[76px]"
                    />
                  ) : (
                    <ShieldCheck
                      className="size-7 text-primary sm:size-9"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="mt-3 line-clamp-2 text-[15px] font-bold leading-snug text-foreground sm:mt-4 sm:text-[17px]">
                  {badge.label}
                </span>
                {badge.sublabel ? (
                  <span className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-sm">
                    {badge.sublabel}
                  </span>
                ) : null}
                {badge.credentialText ? (
                  <span className="mt-2 text-xs font-semibold leading-snug text-foreground/80 sm:text-[13px]">
                    {badge.credentialText}
                  </span>
                ) : null}
                {badge.credentialImageUrl || badge.linkUrl ? (
                  <span className="flex flex-wrap items-center justify-center gap-x-4">
                    {badge.credentialImageUrl ? (
                      <CredentialViewer
                        imageUrl={badge.credentialImageUrl}
                        label={badge.label}
                      />
                    ) : null}
                    {badge.linkUrl ? (
                      <a
                        href={badge.linkUrl}
                        {...(external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="mt-3 inline-flex items-center gap-1 rounded-sm text-[13px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      >
                        View details
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Mobile carousel controls — the grid breakpoints don't need them. */}
      {count > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-4 sm:hidden">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label="Previous credential"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground transition enabled:hover:border-primary/50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-1.5">
            {badges.map((badge, i) => (
              <button
                key={`${badge.label}-dot-${i}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to credential ${i + 1}: ${badge.label}`}
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  i === active ? "w-6 bg-primary" : "w-2 bg-foreground/25",
                )}
              />
            ))}
          </div>
          <span
            className="min-w-9 text-center text-xs font-medium tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {active + 1} / {count}
          </span>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            disabled={active === count - 1}
            aria-label="Next credential"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground transition enabled:hover:border-primary/50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
