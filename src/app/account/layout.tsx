import { requireSession } from "@/lib/auth-helpers";
import { signOutAction } from "@/lib/auth-actions";

/**
 * Server-gated account shell — any authenticated user passes (customers
 * included; role checks happen per-feature, not here). Anonymous visitors
 * are redirected to /login by requireSession before this tree renders.
 * The real customer portal chrome replaces this minimal header in Plan 5.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <span className="font-display text-lg font-semibold tracking-tight">
            TripMate
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
