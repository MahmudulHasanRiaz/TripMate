import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth-helpers";
import ServicesView from "./ServicesView";

export const metadata: Metadata = {
  title: "Services",
};

export const instant = false;

export default async function AdminServicesPage() {
  await requirePermission("orders.view");

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="text-xs text-muted-foreground">
          Record generic and offline service sales — revenue and profit land in the dashboard immediately.
        </p>
      </div>
      <ServicesView />
    </div>
  );
}
