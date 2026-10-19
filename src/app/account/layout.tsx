import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth-helpers";
import { signOutAction } from "@/lib/auth-actions";
import { getSiteSettings } from "@/lib/site-settings";
import { AccountNav } from "./AccountNav";

/** Customer portal is never indexed (§2.2). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  // Settings-driven brand (same reader the public header/admin shell use):
  // the portal shows the configured site name, never a hardcoded string.
  let siteTitle = "TripMate";
  try {
    const site = await getSiteSettings();
    if (site.title?.trim()) siteTitle = site.title.trim();
  } catch {
    // Fallback above stays — a settings failure must never lock customers out.
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6 gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-display text-lg font-semibold tracking-tight text-foreground hover:text-primary transition-colors">
              {siteTitle}
            </Link>
            <AccountNav />
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-muted-foreground">
              {session.user.name || session.user.email}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
