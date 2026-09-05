"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Ends the current session from a server action.
 *
 * Revokes the session cookie read from the incoming request headers via the
 * Better Auth server API, then hard-redirects to /login. Consumed by the
 * signed-in shells (admin / account) once those land in later tasks.
 */
export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login" as Route);
}
