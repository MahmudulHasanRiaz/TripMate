import "server-only";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, type UserRole } from "@/modules/users/permissions";

export type Session = {
  user: { id: string; email: string; name: string; role: UserRole; phone?: string | null };
  session: { id: string; userId: string; expiresAt: Date };
};

export async function getSession(): Promise<Session | null> {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result?.user) return null;
  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: (result.user as Session["user"]).role ?? "customer",
      phone: (result.user as Session["user"]).phone ?? null,
    },
    session: result.session,
  } as Session;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  // typedRoutes (next.config.ts) only knows routes that exist in the app today;
  // /login is created by the auth-pages task, so cast it to Route until then.
  if (!session) redirect("/login" as Route);
  return session;
}

export async function requireRole(...roles: UserRole[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) redirect("/");
  return session;
}

export async function requirePermission(key: string): Promise<Session> {
  const session = await requireSession();
  if (!hasPermission(session.user.role, null, key)) redirect("/");
  return session;
}
