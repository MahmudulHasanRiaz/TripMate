import "./globals.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";

import { themeColor } from "../../theme-colors";
import { resolveFaviconUrl } from "@/lib/seo";
import { themeInitScript } from "@/lib/theme";
import { getPublicSiteSettings } from "@/modules/settings/site-settings";

// Self-hosted fonts (latin) — the network to fonts.gstatic.com on the
// owner's machine flaked hard enough to 500 every request (next/font/google's
// fetch, Follow-up 08 session). Zero network at build/dev time.
// Display face is Poppins (Follow-up 09 §4): the client found the previous
// serif display face (Fraunces) hard for ordinary readers — a clean geometric
// sans now carries every heading; Inter remains the body face.
const display = localFont({
  src: [
    { path: "./fonts/poppins-500-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-600-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins-700-latin.woff2", weight: "700", style: "normal" },
    { path: "./fonts/poppins-800-latin.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

const body = localFont({
  src: "./fonts/inter-var-latin.woff2",
  variable: "--font-inter",
  display: "swap",
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
