"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { CheckSquare, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentsNavProps = {
  canManageGateways: boolean;
};

export function PaymentsNav({ canManageGateways }: PaymentsNavProps) {
  const pathname = usePathname();

  const isQueue = pathname === "/admin/payments";
  const isGateways = pathname.startsWith("/admin/payments/gateways");

  return (
    <div className="flex border-b border-border space-x-6">
      <Link
        href={"/admin/payments" as Route}
        className={cn(
          "flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors",
          isQueue
            ? "border-primary text-primary font-semibold"
            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
        )}
      >
        <CheckSquare className="size-4" aria-hidden="true" />
        Verification Queue
      </Link>

      {canManageGateways ? (
        <Link
          href={"/admin/payments/gateways" as Route}
          className={cn(
            "flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors",
            isGateways
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          <CreditCard className="size-4" aria-hidden="true" />
          Gateway Configuration
        </Link>
      ) : null}
    </div>
  );
}
