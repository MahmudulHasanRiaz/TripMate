import type { ReactNode } from "react";
import { Mail } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import SectionHeader from "@/components/admin/SectionHeader";

export const instant = false;

/**
 * Leads section gate.
 * Requires the leads.view permission.
 */
export default async function LeadsLayout({ children }: { children: ReactNode }) {
  await requirePermission("leads.view");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Leads & Enquiries"
        description="Track, qualify, and convert visitor inquiries from landing pages into bookings."
        icon={Mail}
        accent="var(--c-green)"
      />
      {children}
    </div>
  );
}
