import { redirect } from "next/navigation";
import { getWizardStatus } from "@/modules/settings/wizard";
import { getSetting } from "@/modules/settings/service";
import SetupWizard from "./SetupWizard";

export const metadata = { title: "Setup" };

/**
 * The wizard reads DB-backed settings and redirects when setup is complete, so
 * its output can't be a static shell. Cache Components static-shell
 * prerendering (PPR) opt-out.
 */
export const instant = false;

export default async function SetupPage() {
  const setup = await getSetting("setup");
  if (setup?.setupComplete) redirect("/");
  const status = await getWizardStatus();
  const site = await getSetting("site");
  return <SetupWizard initialStatus={status} initialSite={site} />;
}
