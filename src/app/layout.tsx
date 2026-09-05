import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";

import { themeColor } from "../../theme-colors";
import { themeInitScript } from "@/lib/theme";

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

export const metadata: Metadata = {
  title: { default: "TripMate", template: "%s | TripMate" },
  description: "Hajj & Umrah packages, tours, flights and visa services.",
  icons: { icon: "/favicon.svg" },
};

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
