import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth-helpers";
import { hasPermission } from "@/modules/users/permissions";
import { ExpensesNav } from "./ExpensesNav";

export const instant = false;

export default async function AdminExpensesLayout({ children }: { children: ReactNode }) {
  const session = await requirePermission("expenses.submit");
  const canApprove = hasPermission(session.user.role, null, "expenses.approve");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record operational costs, process expense approvals, and analyze profit and loss statements.
        </p>
      </div>

      <ExpensesNav canApprove={canApprove} />
      {children}
    </div>
  );
}
