import type { ReactNode } from "react";
import { Banknote } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import { hasPermission } from "@/modules/users/permissions";
import SectionHeader from "@/components/admin/SectionHeader";
import { PaymentsNav } from "./PaymentsNav";

export const instant = false;

export default async function AdminPaymentsLayout({ children }: { children: ReactNode }) {
  const session = await requirePermission("payments.verify");
  const canManageGateways = hasPermission(session.user.role, null, "payments.manage_gateways");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Payments"
        description="Review customer payment submissions, verify transaction IDs, and configure payment gateways."
        icon={Banknote}
        accent="var(--c-amber)"
      />

      <PaymentsNav canManageGateways={canManageGateways} />
      {children}
    </div>
  );
}
