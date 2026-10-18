import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import SectionHeader from "@/components/admin/SectionHeader";
import { hasPermission } from "@/modules/users/permissions";
import {
  DEFAULT_HOME_SETTINGS,
  DEFAULT_SITE_SETTINGS,
  getHomeSettings,
  getSiteSettings,
} from "@/modules/settings/site-settings";
import { getThemeSettings } from "@/modules/settings/theme-service";
import { DEFAULT_THEME_SETTINGS } from "@/modules/settings/theme";
import { getPaymentSettings } from "@/modules/payments/settings";
import { DEFAULT_PAYMENT_SETTINGS } from "@/modules/payments/validation";
import { getSetting } from "@/modules/settings/service";
import SettingsTabsView from "./SettingsTabsView";

export const metadata: Metadata = {
  title: "Settings",
};

export const instant = false;

export default async function AdminSettingsPage() {
  const session = await requirePermission("settings.manage");

  const [siteResult, homeResult, themeResult, paymentSettingsResult, storageResult] =
    await Promise.allSettled([
      getSiteSettings(),
      getHomeSettings(),
      getThemeSettings(),
      getPaymentSettings(),
      getSetting("storage"),
    ]);

  if (siteResult.status === "rejected") {
    console.error("[Settings Error] Section 'site' failed to load:", siteResult.reason);
  }
  if (homeResult.status === "rejected") {
    console.error("[Settings Error] Section 'home' failed to load:", homeResult.reason);
  }
  if (themeResult.status === "rejected") {
    console.error("[Settings Error] Section 'theme' failed to load:", themeResult.reason);
  }
  if (paymentSettingsResult.status === "rejected") {
    console.error("[Settings Error] Section 'payments' failed to load:", paymentSettingsResult.reason);
  }
  if (storageResult.status === "rejected") {
    console.error("[Settings Error] Section 'storage' failed to load:", storageResult.reason);
  }

  const site = siteResult.status === "fulfilled" ? siteResult.value : DEFAULT_SITE_SETTINGS;
  const home = homeResult.status === "fulfilled" ? homeResult.value : DEFAULT_HOME_SETTINGS;
  const theme = themeResult.status === "fulfilled" ? themeResult.value : DEFAULT_THEME_SETTINGS;
  const paymentSettings =
    paymentSettingsResult.status === "fulfilled" ? paymentSettingsResult.value : DEFAULT_PAYMENT_SETTINGS;
  const storage = storageResult.status === "fulfilled" ? storageResult.value : null;

  const storageDriver =
    storage && typeof storage === "object" && "driver" in storage
      ? String((storage as Record<string, unknown>).driver)
      : "local";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <SectionHeader
            title="Settings"
            description="Manage brand identity, theme styling, contact details, public homepage copy, and search engine indexing."
            icon={Settings}
            accent="var(--c-orange)"
          />
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

      <SettingsTabsView
        initialSite={site}
        initialHome={home}
        initialTheme={theme}
        initialPaymentSettings={paymentSettings}
        storageDriver={storageDriver}
        canManagePayments={hasPermission(session.user.role, null, "payments.manage_gateways")}
      />
    </div>
  );
}
