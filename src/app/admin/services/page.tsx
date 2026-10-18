import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import SectionHeader from "@/components/admin/SectionHeader";
import ServicesView from "./ServicesView";

export const metadata: Metadata = {
  title: "Services",
};

export const instant = false;

export default async function AdminServicesPage() {
  await requirePermission("orders.view");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Services"
        description="Record generic and offline service sales — revenue and profit land in the dashboard immediately."
        icon={Briefcase}
        accent="var(--c-green)"
      />
      <ServicesView />
    </div>
  );
}
