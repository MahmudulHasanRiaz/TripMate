"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { withGuard } from "@/lib/guard";
import { requireSession, type Session } from "@/lib/auth-helpers";
import {
  updateUserProfile,
  updateUserRole,
  toggleUserStatus,
  type UserRole,
} from "./service";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z.string().trim().optional().or(z.literal("")),
});

export async function updateMyProfileAction(
  input: z.infer<typeof profileSchema>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    await updateUserProfile(session.user.id, {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
    });

    revalidatePath("/account");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update profile" };
  }
}

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["superadmin", "admin", "staff", "customer"]),
});

export const updateUserRoleAction = withGuard(
  { permission: "users.manage" },
  async (rawInput: unknown, session: Session | null) => {
    const parsed = roleSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: "Invalid role payload" };
    }

    if (!session) {
      return { ok: false, error: "Unauthorized" };
    }

    const res = await updateUserRole(
      session.user.id,
      parsed.data.userId,
      parsed.data.role as UserRole,
    );

    if (!res.success) {
      return { ok: false, error: res.error };
    }

    revalidatePath("/admin/users");
    return { ok: true };
  },
);

const statusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "suspended"]),
});

export const toggleUserStatusAction = withGuard(
  { permission: "users.manage" },
  async (rawInput: unknown, session: Session | null) => {
    const parsed = statusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: "Invalid status payload" };
    }

    if (!session) {
      return { ok: false, error: "Unauthorized" };
    }

    const res = await toggleUserStatus(
      session.user.id,
      parsed.data.userId,
      parsed.data.status,
    );

    if (!res.success) {
      return { ok: false, error: res.error };
    }

    revalidatePath("/admin/users");
    return { ok: true };
  },
);

/** Admin set/reset a customer's password (permission-gated, §2.4). */
const setPasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(10, "Password must be at least 10 characters").max(128),
});

export const adminSetPasswordAction = withGuard(
  { permission: "users.manage" },
  async (rawInput: unknown, session: Session | null) => {
    const parsed = setPasswordSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid password payload" };
    }
    if (!session) {
      return { ok: false, error: "Unauthorized" };
    }
    try {
      await auth.api.setUserPassword({
        body: { userId: parsed.data.userId, newPassword: parsed.data.newPassword },
        headers: await headers(),
      });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Failed to set password" };
    }
    revalidatePath("/admin/users");
    return { ok: true };
  },
);

/** Change own password from the customer portal (§2.4). */
const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(10, "New password must be at least 10 characters").max(128),
});

export async function changeOwnPasswordAction(
  input: z.infer<typeof changeOwnPasswordSchema>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireSession();
    const parsed = changeOwnPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      },
      headers: await headers(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to change password" };
  }
}

/** Search users (customers and staff) for pickers across admin forms */
export async function searchUsersAction(term: string) {
  try {
    await requireSession();
    const { listUsers } = await import("./service");
    const result = await listUsers({ search: term.trim() || undefined, perPage: 20 });
    return {
      ok: true,
      items: result.items.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
      })),
    };
  } catch (err) {
    console.error("[searchUsersAction]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to search users", items: [] };
  }
}
