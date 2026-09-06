import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth-helpers";

export const instant = false;

/**
 * Landing Pages admin gate.
 * Requires the content.manage permission.
 */
export default async function LandingPagesLayout({ children }: { children: ReactNode }) {
  await requirePermission("content.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Landing Pages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversion-focused landing pages, lead capture forms, and campaign funnels.
        </p>
      </div>
      {children}
    </div>
  );
}
