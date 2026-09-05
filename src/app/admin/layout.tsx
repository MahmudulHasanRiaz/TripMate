import { requireRole } from "@/lib/auth-helpers";
import { menuForRole } from "@/lib/admin-menu";
import AdminShell from "./AdminShell";

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
