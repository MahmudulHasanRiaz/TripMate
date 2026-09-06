import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth-helpers";

export const instant = false;

export default async function AdminOrdersLayout({ children }: { children: ReactNode }) {
  await requirePermission("orders.view");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage package bookings, review customer inquiries, and prepare quotes.
        </p>
      </div>
      {children}
    </div>
  );
}
