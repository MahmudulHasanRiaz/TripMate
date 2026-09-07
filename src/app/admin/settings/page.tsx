import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth-helpers";
import { getHomeSettings, getSiteSettings } from "@/modules/settings/site-settings";
import { getThemeSettings } from "@/modules/settings/theme-service";
import SettingsTabsView from "./SettingsTabsView";

export const metadata: Metadata = {
  title: "Settings",
};

export const instant = false;

export default async function AdminSettingsPage() {
  await requirePermission("settings.manage");

  const [site, home, theme] = await Promise.all([
    getSiteSettings(),
    getHomeSettings(),
    getThemeSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Manage brand identity, theme styling, contact details, public homepage copy, and search engine indexing.
        </p>
      </div>

      <SettingsTabsView initialSite={site} initialHome={home} initialTheme={theme} />
    </div>
  );
}
