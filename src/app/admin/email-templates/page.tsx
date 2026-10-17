import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth-helpers";
import { listEmailTemplates } from "@/modules/email/admin";
import EmailTemplatesView from "./EmailTemplatesView";

export const metadata: Metadata = {
  title: "Email Templates",
};

export const instant = false;

export default async function AdminEmailTemplatesPage() {
  await requirePermission("settings.manage");

  const templates = listEmailTemplates();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Email Templates</h1>
        <p className="text-sm text-muted-foreground">
          Preview transactional email templates dispatched across the booking and inquiry funnel.
        </p>
      </div>

      <EmailTemplatesView templates={templates} />
    </div>
  );
}
