import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-helpers";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * The sign-in page reads the request session cookie to bounce signed-in users
 * away, so it renders at request time (no static shell). Cache Components
 * static-shell prerendering (PPR) opt-out.
 */
export const instant = false;

export default async function LoginPage() {
  const session = await getSession();
  // Already signed in? Don't show the form — send them onward. Role-aware
  // landing (admin → /admin, customer → /account) is handled by the signed-in
  // shells in later tasks; "/" is always a safe target today.
  if (session) redirect("/");

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10 text-foreground">
      <LoginForm />
    </main>
  );
}
