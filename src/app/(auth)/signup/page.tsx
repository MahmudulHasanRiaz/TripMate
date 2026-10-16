import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-helpers";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Create account",
};

export const instant = false;

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10 text-foreground">
      <SignupForm />
    </main>
  );
}
