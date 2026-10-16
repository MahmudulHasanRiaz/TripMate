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
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-xs text-muted-foreground">
            Manage brand identity, theme styling, contact details, public homepage copy, and search engine indexing.
          </p>
        </div>
        <span
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground"
          title={site.searchEngineVisibility ? "Search engines may index the public site" : "Public site asks search engines to stay out"}
        >
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${site.searchEngineVisibility ? "bg-success" : "bg-muted-foreground/50"}`}
          />
          {site.searchEngineVisibility ? "Indexing on" : "Indexing off"}
        </span>
      </div>

      <SettingsTabsView initialSite={site} initialHome={home} initialTheme={theme} />
    </div>
  );
}
