import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { hasPermission } from "@/modules/users/permissions";
import ResetDataClient from "./ResetDataClient";

export const metadata: Metadata = {
  title: "Reset & Re-initialize · TripMate Admin",
};

export const instant = false;

export default async function AdminResetPage() {
  const session = await requireSession();
  if (!hasPermission(session.user.role, null, "settings.manage")) {
    redirect("/admin");
  }
  return <ResetDataClient />;
}
