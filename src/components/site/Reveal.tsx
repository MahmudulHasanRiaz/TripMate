"use client";

/**
 * Reveal — tiny dependency-free scroll entrance for public sections.
 *
 * Rules of the house (Follow-up 08: "smart, professional, never annoying"):
 *  - transform + opacity ONLY (composited; no layout work, no CLS, INP-safe)
 *  - fires once, then disconnects the observer (no re-trigger flicker)
 *  - applies the final state IMPERATIVELY on the node (zero React re-renders)
 *  - transparently becomes a no-op under prefers-reduced-motion
 *  - subtle default: 14px rise, 500ms, custom stagger via `delay`
 */

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger step in ms (typically index × 80 within a grid row). */
  delay?: number;
  /** Entrance distance in px. Keep small: high-end sites whisper. */
  rise?: number;
};

export function Reveal({ children, className, delay = 0, rise = 14 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      reveal(el);
      return;
    }

    // -8% bottom margin: elements begin rising just before they are fully
    // scrolled into view — feels responsive rather than late.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(el);
            io.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Initial (pre-reveal) paint: hidden + risen. The same inline styles are
  // what the SSR HTML ships, so there is no flash-then-hide on hydration.
  const style: CSSProperties = {
    opacity: 0,
    transform: `translate3d(0, ${rise}px, 0)`,
    ...(delay > 0 ? { transitionDelay: `${delay}ms` } : undefined),
  };

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none motion-reduce:!transform-none motion-reduce:!opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Imperative final state — keeps this purely an external-system update. */
function reveal(el: HTMLElement) {
  el.style.opacity = "1";
  el.style.transform = "translate3d(0, 0, 0)";
}
