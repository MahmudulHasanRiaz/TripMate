import type { ReactNode } from "react";
import { Activity } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import SectionHeader from "@/components/admin/SectionHeader";

export const instant = false;

/**
 * Meta & Tracking admin gate.
 * Requires the tracking.view permission.
 */
export default async function TrackingLayout({ children }: { children: ReactNode }) {
  await requirePermission("tracking.view");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Meta Tracking & CAPI"
        description="Conversions API health, Pixel bootstrap status, and server-side event audit log."
        icon={Activity}
        accent="var(--c-orange)"
      />
      {children}
    </div>
  );
}
