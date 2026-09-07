import "server-only";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users, type userRoleEnum } from "@/modules/users/schema";

export type UserRole = (typeof userRoleEnum.enumValues)[number];

export type UserView = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  role: UserRole;
  status: string;
  avatarUrl: string | null;
  permissions: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getUserById(id: string): Promise<UserView | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) return null;
  return row as UserView;
}

export async function updateUserProfile(
  userId: string,
  data: { name: string; phone?: string | null },
): Promise<UserView | null> {
  const [updated] = await db
    .update(users)
    .set({
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return (updated as UserView) || null;
}

export type ListUsersQuery = {
  search?: string;
  role?: UserRole;
  status?: string;
  page?: number;
  perPage?: number;
};

export type PaginatedUsers = {
  items: UserView[];
  total: number;
  page: number;
  perPage: number;
};

export async function listUsers(query: ListUsersQuery = {}): Promise<PaginatedUsers> {
  const page = Math.max(1, query.page ?? 1);
  const perPage = Math.min(100, Math.max(1, query.perPage ?? 20));
  const offset = (page - 1) * perPage;

  const conditions = [];

  if (query.search?.trim()) {
    const term = `%${query.search.trim()}%`;
    conditions.push(
      or(
        ilike(users.name, term),
        ilike(users.email, term),
        ilike(users.phone, term),
      ),
    );
  }

  if (query.role) {
    conditions.push(eq(users.role, query.role));
  }

  if (query.status) {
    conditions.push(eq(users.status, query.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause),
    db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(perPage)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    items: rows as UserView[],
    total,
    page,
    perPage,
  };
}

export async function updateUserRole(
  actorId: string,
  targetUserId: string,
  newRole: UserRole,
): Promise<{ success: boolean; error?: string }> {
  // Prevent demoting last superadmin
  if (newRole !== "superadmin") {
    const targetUser = await getUserById(targetUserId);
    if (targetUser?.role === "superadmin") {
      const superadmins = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "superadmin"));
      if (Number(superadmins[0]?.count ?? 0) <= 1) {
        return { success: false, error: "Cannot demote the sole superadmin." };
      }
    }
  }

  await db
    .update(users)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(users.id, targetUserId));

  return { success: true };
}

export async function toggleUserStatus(
  actorId: string,
  targetUserId: string,
  newStatus: "active" | "suspended",
): Promise<{ success: boolean; error?: string }> {
  if (actorId === targetUserId && newStatus === "suspended") {
    return { success: false, error: "Cannot suspend your own account." };
  }

  await db
    .update(users)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(users.id, targetUserId));

  return { success: true };
}
