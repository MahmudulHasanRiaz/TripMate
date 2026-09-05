import { redirect } from "next/navigation";
import { getWizardStatus } from "@/modules/settings/wizard";
import { getSetting } from "@/modules/settings/service";
import SetupWizard from "./SetupWizard";

export const metadata = { title: "Setup" };

export default async function SetupPage() {
  const setup = await getSetting("setup");
  if (setup?.setupComplete) redirect("/");
  const status = await getWizardStatus();
  const site = await getSetting("site");
  return <SetupWizard initialStatus={status} initialSite={site} />;
}
