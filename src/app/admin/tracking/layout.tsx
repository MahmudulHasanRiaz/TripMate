import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth-helpers";

export const instant = false;

/**
 * Meta & Tracking admin gate.
 * Requires the tracking.view permission.
 */
export default async function TrackingLayout({ children }: { children: ReactNode }) {
  await requirePermission("tracking.view");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meta Tracking &amp; CAPI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversions API health, Pixel bootstrap status, and server-side event audit log.
        </p>
      </div>
      {children}
    </div>
  );
}
