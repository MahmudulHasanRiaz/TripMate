import type { Metadata } from "next";
import { requireSession } from "@/lib/auth-helpers";
import { menuForRole } from "@/lib/admin-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Placeholder dashboard. Real KPIs land in Plan 6; today it proves the
 * server-gated shell rendered and shows the permission-filtered menu size so
 * the role gating is visible at a glance.
 */
export default async function AdminDashboardPage() {
  const session = await requireSession();
  const sections = menuForRole(session.user.role).length;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Real KPIs arrive in Plan 6.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Menu sections</CardTitle>
            <CardDescription>
              Modules visible to your role across the admin area.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{sections}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Signed in as</CardTitle>
            <CardDescription>
              Role-gated access level for this session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight capitalize">
              {session.user.role}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
