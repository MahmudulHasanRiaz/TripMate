import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth-helpers";
import { hasPermission } from "@/modules/users/permissions";
import { PaymentsNav } from "./PaymentsNav";

export const instant = false;

export default async function AdminPaymentsLayout({ children }: { children: ReactNode }) {
  const session = await requirePermission("payments.verify");
  const canManageGateways = hasPermission(session.user.role, null, "payments.manage_gateways");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review customer payment submissions, verify transaction IDs, and configure payment gateways.
        </p>
      </div>

      <PaymentsNav canManageGateways={canManageGateways} />
      {children}
    </div>
  );
}
