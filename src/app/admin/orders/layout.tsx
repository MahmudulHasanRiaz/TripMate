import type { ReactNode } from "react";
import { BookCopy } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import SectionHeader from "@/components/admin/SectionHeader";

export const instant = false;

export default async function AdminOrdersLayout({ children }: { children: ReactNode }) {
  await requirePermission("orders.view");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Orders"
        description="Manage package bookings, review customer inquiries, and prepare quotes."
        icon={BookCopy}
        accent="var(--c-green)"
      />
      {children}
    </div>
  );
}
