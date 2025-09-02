

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth.tsx";
import { AppProvider } from "@/context/AppContext";
import type { Metadata } from 'next';
import SiteLayoutClient from "@/components/layout/SiteLayoutClient";
import { getGlobalSettings, type GlobalSettings } from "@/lib/data";

// This forces the layout to be dynamically rendered, ensuring fresh data on each request.
export const dynamic = 'force-dynamic';

// This function generates metadata dynamically on the server.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getGlobalSettings();
  
  return {
    title: {
      default: settings.site_title,
      template: `%s | ${settings.site_title}`,
    },
    icons: {
      icon: [
        { url: settings.favicon_url || '/favicon.ico', type: 'image/x-icon' },
      ]
    },
    robots: {
      index: settings.search_engine_visibility,
      follow: settings.search_engine_visibility,
    }
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getGlobalSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider initialSettings={settings}>
            <AuthProvider>
                <SiteLayoutClient>
                    {children}
                </SiteLayoutClient>
                <Toaster />
            </AuthProvider>
        </AppProvider>
      </body>
    </html>
  )
}
