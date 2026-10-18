import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Admin v3 page header — colored icon chip + compact title, matching the
 * artifact reference. The accent should stay in sync with the nav group
 * color (see GROUP_ACCENTS in AdminShell.tsx).
 */
export default function SectionHeader({
  title,
  description,
  icon: Icon,
  accent,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="kpi-chip kpi-chip-lg mt-0.5"
        style={{ "--k": accent } as CSSProperties}
      >
        <Icon aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-0.5">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
