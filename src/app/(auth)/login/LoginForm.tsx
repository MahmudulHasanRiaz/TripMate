"use client";

/**
 * Email + password sign-in — a quiet, tokens-only card.
 *
 * Security contract:
 *  - Every auth failure renders the SAME copy ("Invalid email or password.")
 *    whether the email is unknown or the password is wrong. Better Auth returns
 *    distinct server messages ("User not found" vs "Invalid password") and we
 *    never surface them — doing so would let an attacker enumerate accounts.
 *  - No password-strength hints on login; that copy is registration-only.
 *  - Pasting is never blocked and the password input carries
 *    autoComplete="current-password" so password managers work (WCAG 2.2).
 *  - The password value is never echoed back into the document.
 *
 * On success we navigate to "/" with useRouter().replace(). The replace issues a
 * fresh RSC request for the destination that carries the just-set session
 * cookie (a full page reload via window.location would be the most literal
 * "hard nav", but this repo's lint treats that as an error). "/account" and
 * "/admin" land in later tasks.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import Logo from "@/components/icons/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

/** Single, deliberately vague credential error — never a user-existence hint. */
const INVALID_CREDENTIALS = "Invalid email or password.";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address"),
  password: z.string().min(1, "Enter your password"),
});
type LoginValues = z.infer<typeof loginSchema>;

export default function LoginForm({ brand }: { brand?: string }) {
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setAuthError(null);
    try {
      const res = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (res.error) {
        setAuthError(res.error.message || INVALID_CREDENTIALS);
        return;
      }
      const userRole = (res.data?.user as { role?: string } | undefined)?.role;
      const target =
        userRole && ["superadmin", "admin", "staff"].includes(userRole)
          ? "/admin"
          : "/";
      router.replace(target);
      router.refresh();
    } catch {
      setAuthError(INVALID_CREDENTIALS);
    } finally {
      setBusy(false);
    }
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center gap-2 text-center">
        <Logo className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <CardDescription>Enter your credentials to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={submit} noValidate className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      className="h-11"
                      disabled={busy}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      className="h-11"
                      disabled={busy}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {authError ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
              >
                {authError}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {busy ? "Signing in…" : "Sign in"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              New to {brand?.trim() || "TripMate"}?{" "}
              <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
