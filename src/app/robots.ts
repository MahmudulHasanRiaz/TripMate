import type { MetadataRoute } from "next";

import { origin } from "@/lib/seo";

/**
 * Generated robots.txt.
 *
 * Public crawlable surface is allowed; the auth/account/admin/media/setup and
 * API namespaces are admin-only and never meant for a search index. The sitemap
 * line uses the shared trailing-slash-normalised origin helper (the same one
 * sitemap.ts builds its URLs from) so the two files can never disagree about the
 * base URL — and an `APP_URL` with a trailing slash can never yield a doubled
 * `//` separator.
 *
 * Note: `robots.ts` (like `sitemap.ts`) is a special Route Handler cached by
 * default, and this function touches no request-time API, so Next serves it as
 * a static asset. Deliberately env-only (no DB read): it must keep answering
 * even before the setup wizard seeds settings, and the site/`site` visibility
 * flag that gates page-level noindex lives with the page metadata, not here.
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/setup"],
    },
    sitemap: `${origin()}/sitemap.xml`,
  };
}
