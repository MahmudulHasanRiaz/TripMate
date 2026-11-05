"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Count-up for stat values (FU-23). Animates the first numeric token of
 * values like "25,000+", "4.9/5", "12+" from zero when the band scrolls
 * into view — prefix, grouping commas, decimals, and suffix are
 * preserved exactly, and the final frame lands on the verbatim string.
 * Server/no-JS and reduced-motion visitors simply see the real value.
 */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const match = value.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!match) return;
    const [, prefix, numRaw, suffix] = match;
    const target = parseFloat((numRaw ?? "").replace(/,/g, ""));
    if (!Number.isFinite(target) || target <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const decimals = numRaw?.includes(".")
      ? (numRaw.split(".")[1]?.length ?? 0)
      : 0;
    const grouped = numRaw?.includes(",") ?? false;
    const format = (n: number) => {
      const fixed = n.toFixed(decimals);
      const body = grouped
        ? Number(fixed).toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : fixed;
      return `${prefix}${body}${suffix}`;
    };

    let raf = 0;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started) return;
        started = true;
        const t0 = performance.now();
        const duration = 1200;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(format(target * eased));
          if (p < 1) {
            raf = requestAnimationFrame(tick);
          } else {
            setDisplay(value);
          }
        };
        raf = requestAnimationFrame(tick);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return <span ref={ref}>{display}</span>;
}
