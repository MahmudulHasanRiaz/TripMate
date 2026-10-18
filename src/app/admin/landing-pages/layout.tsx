import type { ReactNode } from "react";
import { Megaphone } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import SectionHeader from "@/components/admin/SectionHeader";

export const instant = false;

/**
 * Landing Pages admin gate.
 * Requires the content.manage permission.
 */
export default async function LandingPagesLayout({ children }: { children: ReactNode }) {
  await requirePermission("content.manage");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Landing Pages"
        description="Conversion-focused landing pages, lead capture forms, and campaign funnels."
        icon={Megaphone}
        accent="var(--c-pink)"
      />
      {children}
    </div>
  );
}
