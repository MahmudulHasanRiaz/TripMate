"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

import type { SiteAccreditation } from "@/lib/site-settings";
import { CredentialViewer } from "./CredentialViewer";
import { cn } from "@/lib/utils";

/**
 * Accreditations track (Follow-up 20; autoplay loop + alignment
 * Follow-up 21).
 *
 * Mobile (<sm): a horizontal swipe carousel with AUTOPLAY — one card
 * (~82%) sits CENTERED with both neighbours peeking, advancing every
 * 1.5s and looping seamlessly (the badge set is duplicated once;
 * landing on a duplicate silently resets to its identical twin, so the
 * motion never visibly rewinds or stops at the end). Autoplay pauses
 * while the visitor touches/swipes, hovers, focuses inside, the
 * section is off-screen, the tab is hidden, a dialog is open, or the
 * visitor prefers reduced motion. Pagination dots + a "1 / 5" counter
 * + prev/next buttons sit below.
 *
 * Mobile cards hug their own content height and center vertically in
 * the track (Follow-up 22): stretching every card to the tallest one
 * left a hollow void inside cards that carry no credential, which read
 * as a design gap next to a fuller neighbour. Grid breakpoints keep
 * the equal-height zoned rhythm instead.
 *
 * Tablet (sm): the 2-column grid. Desktop (lg): the 3-column grid with
 * the balanced final row (count % 3 == 2 → last two cards span wider).
 *
 * Card structure is zoned so content volume can't unbalance the row:
 * the plate is fixed at the top, the title/sublabel block reserves its
 * 2-line height, and the credential block (text + actions) is pinned
 * to the bottom on the grid breakpoints.
 *
 * Optional credential text/image/link render only when configured —
 * blank stays invisible (standing rule).
 */

const AUTOPLAY_MS = 1500;
const RESUME_MS = 4000;

export function AccreditationsShowcase({
  badges,
}: {
  badges: SiteAccreditation[];
}) {
  const trackRef = useRef<HTMLUListElement | null>(null);
  const pausedRef = useRef(false);
  const resumeTimer = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);
  const [active, setActive] = useState(0);
  const count = badges.length;
  // Mobile renders the set twice for the seamless loop; grid
  // breakpoints hide the duplicates (sm:hidden on those items).
  const looped = count > 1 ? [...badges, ...badges] : badges;

  const reducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const centeredLeft = (child: HTMLElement) => {
    const track = trackRef.current;
    if (!track) return 0;
    return child.offsetLeft - (track.clientWidth - child.offsetWidth) / 2;
  };

  /** Raw child index (0..2N-1) whose center is nearest the track center. */
  const rawIndexFromScroll = () => {
    const track = trackRef.current;
    if (!track || !track.children.length) return 0;
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < track.children.length; i++) {
      const child = track.children[i] as HTMLElement;
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(childCenter - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  };

  const scrollToChild = (i: number, smooth: boolean) => {
    const track = trackRef.current;
    const child = track?.children[i] as HTMLElement | undefined;
    if (!track || !child) return;
    track.scrollTo({
      left: centeredLeft(child),
      behavior: smooth && !reducedMotion() ? "smooth" : "auto",
    });
  };

  /**
   * Keep the resting position inside the first copy: sitting on a
   * duplicate (raw index >= count) is visually identical to its twin,
   * so jump there silently. Runs debounced after scrolling settles.
   */
  const normalizeLoop = () => {
    const track = trackRef.current;
    if (!track || count <= 1) return;
    const raw = rawIndexFromScroll();
    if (raw >= count) {
      scrollToChild(raw - count, false);
      setActive(raw - count);
    }
  };

  const handleScroll = () => {
    const raw = rawIndexFromScroll();
    setActive(raw % count);
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(normalizeLoop, 140);
  };

  const goTo = (i: number) => {
    if (count <= 1) return;
    const rawNow = rawIndexFromScroll();
    // Work from the first-copy twin so targets always exist.
    const raw = rawNow >= count ? rawNow - count : rawNow;
    const base = raw % count;
    if (i === base) return;
    if (i === 0 && base === count - 1) {
      // Forward over the seam: slide onto the duplicate of card 0,
      // then normalizeLoop snaps back to the real card 0 invisibly.
      scrollToChild(raw + 1, true);
      return;
    }
    if (i === count - 1 && base === 0) {
      // Backward over the seam: jump silently to the duplicate of
      // card 0 (identical frame), then slide to the last card.
      scrollToChild(raw + count, false);
      requestAnimationFrame(() => scrollToChild(raw + count - 1, true));
      return;
    }
    scrollToChild(raw + (i - base), true);
  };

  const pause = () => {
    pausedRef.current = true;
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
  };

  const resumeSoon = () => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_MS);
  };

  // Autoplay: mobile carousel only, visible + on-screen + untouched.
  useEffect(() => {
    if (count <= 1 || reducedMotion()) return;
    const mobile = window.matchMedia("(max-width: 639px)");
    let inView = true;
    const track = trackRef.current;
    const observer =
      track && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              inView = entries[0]?.isIntersecting ?? true;
            },
            { threshold: 0.4 },
          )
        : null;
    if (track && observer) observer.observe(track);
    const timer = window.setInterval(() => {
      if (
        !mobile.matches ||
        pausedRef.current ||
        !inView ||
        document.hidden ||
        document.querySelector('[role="dialog"]')
      ) {
        return;
      }
      const rawNow = rawIndexFromScroll();
      const raw = rawNow >= count ? rawNow - count : rawNow;
      scrollToChild(raw + 1, true);
    }, AUTOPLAY_MS);
    return () => {
      window.clearInterval(timer);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div
      onPointerDown={pause}
      onPointerUp={resumeSoon}
      onPointerCancel={resumeSoon}
      onMouseEnter={pause}
      onMouseLeave={resumeSoon}
      onFocus={pause}
      onBlur={resumeSoon}
    >
      <ul
        ref={trackRef}
        onScroll={handleScroll}
        aria-label="Accreditations and licences"
        className="relative mt-8 flex snap-x snap-mandatory items-center gap-3 overflow-x-auto px-[9%] pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:snap-none sm:grid-cols-2 sm:items-stretch sm:gap-4 sm:overflow-visible sm:p-0 lg:grid-cols-6"
      >
        {looped.map((badge, i) => {
          const duplicate = i >= count;
          const baseIndex = i % count;
          // Balance a final partial row on desktop: when the count
          // leaves 2 cards over (5, 8, …), the last two span wider so
          // the row stays symmetric instead of stranding one card.
          const balanced = count % 3 === 2 && baseIndex >= count - 2;
          const external = /^https?:\/\//i.test(badge.linkUrl);
          return (
            <li
              key={`${badge.label}-${i}`}
              aria-hidden={duplicate || undefined}
              inert={duplicate || undefined}
              className={cn(
                "w-[82%] shrink-0 snap-center sm:w-auto sm:shrink",
                balanced ? "lg:col-span-3" : "lg:col-span-2",
                duplicate && "sm:hidden",
              )}
            >
              <div className="group flex h-full flex-col items-center rounded-2xl border border-border bg-card p-4 text-center transition duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 sm:p-5">
                <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-border/70 transition-transform duration-300 group-hover:scale-[1.04] sm:size-[88px]">
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
                {/* Reserved-height text zone: titles/sublabels start and
                    end at the same offsets on every card. */}
                <div className="mt-3 flex min-h-[74px] flex-col items-center sm:mt-4 sm:min-h-[86px]">
                  <span className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground sm:text-[17px]">
                    {badge.label}
                  </span>
                  {badge.sublabel ? (
                    <span className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-sm">
                      {badge.sublabel}
                    </span>
                  ) : null}
                </div>
                {/* Credential zone pinned to the card's bottom edge, so
                    cards with and without credentials share one rhythm. */}
                <div className="mt-auto flex flex-col items-center pt-2">
                  {badge.credentialText ? (
                    <span className="text-xs font-semibold leading-snug text-foreground/80 sm:text-[13px]">
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
                          <ArrowUpRight
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        </a>
                      ) : null}
                    </span>
                  ) : null}
                </div>
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
            onClick={() => goTo((active - 1 + count) % count)}
            aria-label="Previous credential"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
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
            onClick={() => goTo((active + 1) % count)}
            aria-label="Next credential"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
