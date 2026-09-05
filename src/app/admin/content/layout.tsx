import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth-helpers";
import { ContentNav } from "./ContentNav";

/**
 * Content section gate. The parent /admin layout already restricts the whole
 * tree to staff/admin/superadmin; this layout additionally requires the
 * content.manage permission so staff roles WITHOUT content access (none today,
 * but the model allows it) are kept out. `instant = false` mirrors the admin
 * layout: the section reads the session cookie on every request, so there is no
 * static shell to prerender under Cache Components.
 */
export const instant = false;

export default async function ContentLayout({ children }: { children: ReactNode }) {
  await requirePermission("content.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Blog posts, post categories and the evergreen static pages.
        </p>
      </div>
      <ContentNav />
      {children}
    </div>
  );
}
