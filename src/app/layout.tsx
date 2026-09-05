import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0F14" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body className="font-body" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
