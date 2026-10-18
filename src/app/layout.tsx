import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";

import { themeColor } from "../../theme-colors";
import { resolveFaviconUrl } from "@/lib/seo";
import { themeInitScript } from "@/lib/theme";
import { getPublicSiteSettings } from "@/modules/settings/site-settings";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "600"],
});

/**
 * Root metadata is settings-driven: the site name (title default/template)
 * and the favicon come from the cached settings row, so an admin save lands
 * in one cache hop (updateTag(CACHE_TAGS.settings) → getPublicSiteSettings).
 * The reader's own contract documents exactly this duty (title/favicon/
 * noindex); the noindex half lives in the (public) group layout.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteSettings();
  const siteName = site.title?.trim() || "TripMate";
  return {
    title: { default: siteName, template: `%s | ${siteName}` },
    description: "Hajj & Umrah packages, tours, flights and visa services.",
    icons: { icon: resolveFaviconUrl(site.faviconUrl) },
  };
}

export const viewport: Viewport = {
  themeColor,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body className="font-body" suppressHydrationWarning>
        {children}
        {/* Pre-paint theme bootstrap: inline beforeInteractive script reads the
            saved theme + sets .dark on <html> before first paint (no FOUC).
            Children-as-string is the documented next/script inline form and
            deliberately avoids dangerouslySetInnerHTML / the react/no-danger
            gate. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </body>
    </html>
  );
}
