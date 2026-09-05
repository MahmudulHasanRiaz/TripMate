import { requireRole } from "@/lib/auth-helpers";
import { menuForRole } from "@/lib/admin-menu";
import AdminShell from "./AdminShell";

/**
 * Session-gated admin shell: the whole subtree depends on the request's
 * session cookie, so there is no meaningful static shell to prerender. Opt
 * the subtree out of Cache Components' static-shell prerendering (PPR) — under
 * `cacheComponents` this is the documented replacement for the old
 * `dynamic = "force-dynamic"`.
 */
export const instant = false;

/**
 * Server-gated admin shell. No customer ever sees this tree rendered:
 *   - anonymous   -> /login  (requireSession)
 *   - customer    -> /       (requireRole)
 *   - staff/admin/superadmin -> the shell below
 *
 * The menu handed to AdminShell is ALREADY permission-filtered here on the
 * server; the client shell renders exactly what it receives and performs no
 * permission logic of its own.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("superadmin", "admin", "staff");

  return (
    <AdminShell
      menu={menuForRole(session.user.role)}
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
