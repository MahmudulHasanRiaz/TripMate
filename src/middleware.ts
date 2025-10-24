
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseClient_server } from './lib/supabase';

async function checkSetupStatus(): Promise<boolean> {
    try {
        const supabase = getSupabaseClient_server();
        if (!supabase) {
            // If the client couldn't be created (e.g., missing env vars),
            // assume setup is not complete.
            return false;
        }

        const { data, error } = await supabase
            .from('site_status')
            .select('is_setup_complete')
            .limit(1)
            .single();

        // If there's an error (e.g., table not found), it means setup is not complete.
        if (error) {
            return false;
        }

        return data?.is_setup_complete || false;

    } catch (error) {
        // If any catastrophic error happens,
        // assume setup is not complete to be safe.
        console.error("Middleware setup check failed:", error);
        return false;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // These paths should always be accessible, regardless of setup status.
    const unrestrictedPaths = [
        '/_next/',
        '/api/',
        '/favicon.ico',
        // Add other static file paths if necessary
    ];

    if (unrestrictedPaths.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    const isSetupComplete = await checkSetupStatus();
    const isOnSetupPage = pathname.startsWith('/setup');

    if (!isSetupComplete) {
        // If setup is not complete, ONLY allow access to the setup page.
        // Redirect any other request to the setup page.
        if (!isOnSetupPage) {
            return NextResponse.redirect(new URL('/setup', request.url));
        }
    } else {
        // If setup IS complete, redirect away from the setup page to the homepage.
        if (isOnSetupPage) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - api (API routes)
   * This is a more robust way to exclude static assets.
   */
  matcher: '/((?!_next/static|_next/image|api|favicon.ico).*)',
}
