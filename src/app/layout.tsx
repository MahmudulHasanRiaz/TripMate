

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth.tsx";
import { AppProvider } from "@/context/AppContext";
import type { Metadata } from 'next';
import SiteLayoutClient from "@/components/layout/SiteLayoutClient";
import { getGlobalSettings, type GlobalSettings, defaultSettings } from "@/lib/data";
import { getSupabaseClient_server } from "@/lib/supabase";

// This forces the layout to be dynamically rendered, ensuring fresh data on each request.
export const dynamic = 'force-dynamic';

async function getLayoutData() {
  const supabase = getSupabaseClient_server();
  
  if (!supabase) {
    return { settings: defaultSettings, isSetupComplete: false };
  }

  const { data: statusData } = await supabase
    .from('site_status')
    .select('is_setup_complete')
    .limit(1)
    .maybeSingle();

  const isSetupComplete = statusData?.is_setup_complete || false;

  if (!isSetupComplete) {
    // If setup is not complete, don't try to fetch settings from the DB.
    // Return the hardcoded default settings.
    return { settings: defaultSettings, isSetupComplete: false };
  }
  
  // If setup is complete, fetch the live settings.
  const settings = await getGlobalSettings();
  return { settings, isSetupComplete: true };
}


// This function generates metadata dynamically on the server.
export async function generateMetadata(): Promise<Metadata> {
  const supabase = getSupabaseClient_server();

  if (!supabase) {
    return {
      title: defaultSettings.site_title,
      robots: { index: false, follow: false }
    };
  }

  const { data: statusData } = await supabase.from('site_status').select('is_setup_complete').limit(1).maybeSingle();
  const isSetupComplete = statusData?.is_setup_complete || false;

  let settings = defaultSettings;
  if (isSetupComplete) {
    settings = await getGlobalSettings();
  }
  
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
  const { settings, isSetupComplete } = await getLayoutData();

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
        <AppProvider initialSettings={settings} isSetupComplete={isSetupComplete}>
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
