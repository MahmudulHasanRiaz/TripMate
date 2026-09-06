"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { BarChart3, FolderTree, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

type ExpensesNavProps = {
  canApprove: boolean;
};

export function ExpensesNav({ canApprove }: ExpensesNavProps) {
  const pathname = usePathname();

  const isEntries = pathname === "/admin/expenses";
  const isCategories = pathname.startsWith("/admin/expenses/categories");
  const isReports = pathname.startsWith("/admin/expenses/reports");

  return (
    <div className="flex border-b border-border space-x-6">
      <Link
        href={"/admin/expenses" as Route}
        className={cn(
          "flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors",
          isEntries
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
        )}
      >
        <Receipt className="size-4" aria-hidden="true" />
        Expense Entries
      </Link>

      {canApprove ? (
        <Link
          href={"/admin/expenses/categories" as Route}
          className={cn(
            "flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors",
            isCategories
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          <FolderTree className="size-4" aria-hidden="true" />
          Categories
        </Link>
      ) : null}

      <Link
        href={"/admin/expenses/reports" as Route}
        className={cn(
          "flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors",
          isReports
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
        )}
      >
        <BarChart3 className="size-4" aria-hidden="true" />
        Financial Reports (P&L)
      </Link>
    </div>
  );
}
