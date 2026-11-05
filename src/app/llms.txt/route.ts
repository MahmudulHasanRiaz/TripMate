import { headers } from "next/headers";

import { origin } from "@/lib/seo";
import { getPublicSiteSettings } from "@/modules/settings/site-settings";

/**
 * Public base URL for the links below. `origin()` is the env APP_URL,
 * which lags reality when a deployment's APP_URL is unset/stale (the
 * production stack currently serves APP_URL as localhost — visible in
 * robots.txt's Sitemap line), so prefer the proxy-forwarded request
 * host, which always names the site the agent actually reached.
 */
async function publicBase(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return origin();
}

/**
 * /llms.txt — the llmstxt.org discovery file for AI agents and answer
 * engines: a plain-markdown index of what this agency is and where its
 * key pages live. Content is settings-driven like every other public
 * surface (site name + contact channels from the same cached settings
 * row the chrome reads), and optional lines render only when the value
 * is configured — an unconfigured channel leaves no trace, per the
 * site's blank-is-invisible rule. Link targets mirror the public route
 * surface (home, packages, visa desk, journal, FAQ, legal pages).
 */
export async function GET(): Promise<Response> {
  const site = await getPublicSiteSettings();
  const base = await publicBase();
  const name = site.title?.trim() || "Travel agency";

  const lines: string[] = [
    `# ${name}`,
    "",
    `> ${name} — Hajj & Umrah packages, tours, flights and visa services. ` +
      "Fixed packages carry transparent all-in pricing; every booking is " +
      "handled by a human travel advisor.",
    "",
    "## Key pages",
    "",
    `- [Home](${base}/): Overview, featured packages and the booking desk.`,
    `- [Packages](${base}/packages): Browse Hajj, Umrah and holiday packages with all-in pricing; filter by destination, category or budget.`,
    `- [Visa services](${base}/visa): Visa processing and immigration assistance by country.`,
    `- [Journal](${base}/blog): Travel guides, pilgrimage preparation and agency news.`,
    `- [FAQ](${base}/faq): Answers on Hajj, Umrah, visas, payments and travel documents.`,
    `- [Terms of Service](${base}/terms-of-service): Booking terms and policies.`,
    `- [Privacy Policy](${base}/privacy-policy): How personal data is handled.`,
    "",
    "## Contact",
    "",
  ];

  const phone = site.phone?.trim();
  const whatsapp = (site.whatsappNumber || site.phone || "").replace(/[^0-9]/g, "");
  const email = site.email?.trim();
  const address = site.address?.trim();
  if (phone) lines.push(`- Phone: ${phone}`);
  if (whatsapp) lines.push(`- WhatsApp: https://wa.me/${whatsapp}`);
  if (email) lines.push(`- Email: ${email}`);
  if (address) lines.push(`- Office: ${address}`);
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
