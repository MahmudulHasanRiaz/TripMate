import type { ReactNode } from "react";
import { Package } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import SectionHeader from "@/components/admin/SectionHeader";
import { CatalogNav } from "./CatalogNav";

/**
 * Catalog section gate. The parent /admin layout already restricts the whole
 * tree to staff/admin/superadmin; this layout additionally requires the
 * catalog.manage permission so staff roles WITHOUT catalog access (none today,
 * but the model allows it) are kept out. `instant = false` mirrors the admin
 * layout: the section reads the session cookie on every request, so there is no
 * static shell to prerender under Cache Components.
 */
export const instant = false;

export default async function CatalogLayout({ children }: { children: ReactNode }) {
  await requirePermission("catalog.manage");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Catalog"
        description="Listings, service categories and destinations."
        icon={Package}
        accent="var(--c-violet)"
      />
      <CatalogNav />
      {children}
    </div>
  );
}
