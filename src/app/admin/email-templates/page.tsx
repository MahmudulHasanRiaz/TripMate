import type { Metadata } from "next";
import { MailOpen } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import SectionHeader from "@/components/admin/SectionHeader";
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
      <SectionHeader
        title="Email Templates"
        description="Preview transactional email templates dispatched across the booking and inquiry funnel."
        icon={MailOpen}
        accent="var(--c-orange)"
      />

      <EmailTemplatesView templates={templates} />
    </div>
  );
}
