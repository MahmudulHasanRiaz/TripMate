import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth-helpers";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Listings, service categories and destinations.
        </p>
      </div>
      <CatalogNav />
      {children}
    </div>
  );
}
