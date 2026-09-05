import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TripMate",
  description: "Tours, Hajj & Umrah packages, flights and visa services.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
