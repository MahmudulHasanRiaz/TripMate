import type { ReactNode } from "react";
import { Receipt } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import { hasPermission } from "@/modules/users/permissions";
import SectionHeader from "@/components/admin/SectionHeader";
import { ExpensesNav } from "./ExpensesNav";

export const instant = false;

export default async function AdminExpensesLayout({ children }: { children: ReactNode }) {
  const session = await requirePermission("expenses.submit");
  const canApprove = hasPermission(session.user.role, null, "expenses.approve");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Expenses"
        description="Record operational costs, process expense approvals, and analyze profit and loss statements."
        icon={Receipt}
        accent="var(--c-amber)"
      />

      <ExpensesNav canApprove={canApprove} />
      {children}
    </div>
  );
}
