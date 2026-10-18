"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { BarChart3, FolderTree, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

type ExpensesNavProps = {
  canApprove: boolean;
};

function pillClass(active: boolean) {
  return cn(
    "flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors",
    active
      ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,20,.08)]"
      : "text-muted-foreground hover:text-foreground",
  );
}

export function ExpensesNav({ canApprove }: ExpensesNavProps) {
  const pathname = usePathname();

  const isEntries = pathname === "/admin/expenses";
  const isCategories = pathname.startsWith("/admin/expenses/categories");
  const isReports = pathname.startsWith("/admin/expenses/reports");

  return (
    <div className="inline-flex items-center gap-1 rounded-[10px] border border-border bg-secondary/40 p-1">
      <Link
        href={"/admin/expenses" as Route}
        aria-current={isEntries ? "page" : undefined}
        className={pillClass(isEntries)}
      >
        <Receipt className="size-3.5" aria-hidden="true" />
        Expense Entries
      </Link>

      {canApprove ? (
        <Link
          href={"/admin/expenses/categories" as Route}
          aria-current={isCategories ? "page" : undefined}
          className={pillClass(isCategories)}
        >
          <FolderTree className="size-3.5" aria-hidden="true" />
          Categories
        </Link>
      ) : null}

      <Link
        href={"/admin/expenses/reports" as Route}
        aria-current={isReports ? "page" : undefined}
        className={pillClass(isReports)}
      >
        <BarChart3 className="size-3.5" aria-hidden="true" />
        Financial Reports (P&amp;L)
      </Link>
    </div>
  );
}
