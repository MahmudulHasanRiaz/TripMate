"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
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
