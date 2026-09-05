import type { Metadata } from "next";
import { requireSession } from "@/lib/auth-helpers";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "My Account",
};

/**
 * Account placeholder. The customer portal (profile, bookings, payments)
 * arrives in Plan 5; today the page proves the session-gated route renders
 * and shows who is signed in.
 */
export default async function AccountPage() {
  const session = await requireSession();

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">My Account</h1>
        <p className="text-sm text-muted-foreground">
          Customer portal arrives in Plan 5.
        </p>
      </div>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">
            {session.user.name || session.user.email}
          </CardTitle>
          <CardDescription>{session.user.email}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
