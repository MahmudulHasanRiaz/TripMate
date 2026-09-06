import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth-helpers";

export const instant = false;

/**
 * Leads section gate.
 * Requires the leads.view permission.
 */
export default async function LeadsLayout({ children }: { children: ReactNode }) {
  await requirePermission("leads.view");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads &amp; Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track, qualify, and convert visitor inquiries from landing pages into bookings.
        </p>
      </div>
      {children}
    </div>
  );
}
