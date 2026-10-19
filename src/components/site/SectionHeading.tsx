import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/Reveal";

type SectionHeadingProps = {
  /** Tiny uppercase primary label above the title (spec §3 SectionHeading). */
  kicker?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

/**
 * The public site's consistency anchor: every content section opens with the
 * same kicker → display-title → lead rhythm, so section openers read as one
 * system across the home page, landing sections and blog/article heads.
 */
export function SectionHeading({
  kicker,
  title,
  lead,
  align = "left",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";
  // Every section opener rises with the same one-time entrance — one shared
  // motion rhythm across all public sections (Follow-up 08).
  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        centered && "mx-auto text-center",
        className,
      )}
    >
      {kicker ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          {kicker}
        </p>
      ) : null}
      <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {lead ? (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {lead}
        </p>
      ) : null}
    </Reveal>
  );
}
