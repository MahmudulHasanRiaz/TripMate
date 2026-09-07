import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { hasPermission } from "@/modules/users/permissions";
import { listUsers, type UserRole } from "@/modules/users/service";
import UsersView from "./UsersView";

export const metadata: Metadata = { title: "Users & Customers · TripMate Admin" };
export const instant = false;

type SearchParams = {
  search?: string;
  role?: string;
  status?: string;
  page?: string;
};

const PER_PAGE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const canManage = hasPermission(
    session.user.role,
    null,
    "users.manage",
  );

  if (!canManage) {
    redirect("/admin");
  }

  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search.trim() : "";
  const roleRaw = typeof sp.role === "string" ? sp.role : "";
  const validRoles = ["superadmin", "admin", "staff", "customer"];
  const role = validRoles.includes(roleRaw) ? (roleRaw as UserRole) : undefined;
  const statusRaw = typeof sp.status === "string" ? sp.status : "";
  const status = ["active", "suspended"].includes(statusRaw) ? statusRaw : undefined;
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const paginated = await listUsers({
    search: search || undefined,
    role,
    status,
    page,
    perPage: PER_PAGE,
  });

  return (
    <UsersView
      items={paginated.items}
      total={paginated.total}
      currentSearch={search}
      currentRole={role}
      currentStatus={status}
      currentPage={page}
      perPage={PER_PAGE}
      currentUser={{
        id: session.user.id,
        role: session.user.role,
      }}
    />
  );
}
