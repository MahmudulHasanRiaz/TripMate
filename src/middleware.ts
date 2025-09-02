
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function checkSetupStatus(request: NextRequest): Promise<boolean> {
    try {
        const url = new URL('/api/setup-check', request.url);
        const response = await fetch(url.toString(), {
            // Prevent caching of this critical check
            cache: 'no-store', 
        });

        if (!response.ok) {
            console.error(`Middleware setup check failed with status: ${response.status}`);
            return true;
        }

        const data = await response.json();
        
        // Ensure we check for the specific property
        if (typeof data.isSetupComplete === 'boolean') {
            return data.isSetupComplete;
        }

        // Default to true if the property is missing to avoid lockout
        console.warn("Middleware warning: 'isSetupComplete' property missing from /api/setup-check response. Defaulting to true.");
        return true;

    } catch (error: any) {
        console.error("Middleware error fetching setup status:", error);
        return true; 
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow access to static files, Next.js internals, and specific API routes
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/setup-check') ||
        pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|css|js)$/)
    ) {
        return NextResponse.next();
    }
    
    const isSetupComplete = await checkSetupStatus(request);
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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
