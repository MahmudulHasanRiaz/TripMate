import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth-helpers";

/**
 * Media section gate. The parent /admin layout already restricts the whole
 * tree to staff/admin/superadmin; this layout additionally requires the
 * media.manage permission so roles without it (customers, and staff variants
 * stripped of media access) are kept out. `instant = false` mirrors the admin
 * layout: the section reads the session cookie on every request, so there is no
 * static shell to prerender under Cache Components.
 */
export const instant = false;

export default async function MediaLayout({ children }: { children: ReactNode }) {
  await requirePermission("media.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload, caption and manage the images and PDFs your listings link to.
        </p>
      </div>
      {children}
    </div>
  );
}
