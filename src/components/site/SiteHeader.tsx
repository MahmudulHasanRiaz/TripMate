"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { LogIn, Menu, User } from "lucide-react";

import { cn } from "@/lib/utils";
import Logo from "@/components/icons/Logo";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "./ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type PublicNavItem = {
  label: string;
  href: Route;
};

/**
 * The public navigation. Generic (Packages / Blog / About) in this task;
 * a later task will drive items + CTA from site settings.
 *
 * hrefs are cast because typed routes don't enumerate route-group paths and
 * `/{slug}` is a dynamic-segment surface; the casts stay until the types
 * can validate them (Task 9 noted the same).
 */
const NAV_ITEMS: PublicNavItem[] = [
  { label: "Packages", href: "/packages" as Route },
  { label: "Visa Services", href: "/visa" as Route },
  { label: "Blog", href: "/blog" as Route },
  // About lands on the seeded about-us static page (Task 12) — evergreen pages
  // are served at the root /{slug} surface, so /about-us is canonical and
  // legacy /p/* URLs only 301-redirect here.
  { label: "About", href: "/about-us" as Route },
];

type SiteHeaderProps = {
  title: string;
  logoUrl: string;
  /** True when the header sits directly on hero imagery (transparent at top). */
  overHero?: boolean;
};

/**
 * Sticky public header. Client island: it needs scroll state (blur + shrink),
 * the mobile sheet menu, and the theme toggle — none of which exist on the
 * server. All display data arrives as props from the server (public) layout.
 */
export function SiteHeader({ title, logoUrl, overHero = false }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Once the page scrolls (or there is no hero to be transparent over) the
  // header grounds itself: translucent blur + hairline. Border is always laid
  // out so the color swap on scroll never shifts the header's height.
  const grounded = scrolled || !overHero;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-300",
        grounded
          ? "border-border bg-background/85 shadow-sm backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1400px] items-center gap-4 px-4 transition-all duration-300 lg:px-8",
          scrolled ? "py-1.5" : "py-2",
        )}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="text-primary">
            {logoUrl ? (
              // Settings-driven logo: arbitrary host + unknown intrinsic size
              // rule out next/image (needs configured domains + fixed dims).
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-8 w-auto" />
            ) : (
              <Logo className="size-6" aria-hidden="true" />
            )}
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            {title}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          <nav aria-label="Main" className="hidden items-center md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden sm:flex items-center">
            {session?.user ? (
              <Link
                href={"/account" as Route}
                className="flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-secondary/70 px-3.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-secondary hover:border-primary/50"
              >
                <User className="size-3.5 text-primary" />
                <span>My Bookings</span>
              </Link>
            ) : (
              <Link
                href={"/login" as Route}
                className="flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <LogIn className="size-3.5" />
                <span>Sign in</span>
              </Link>
            )}
          </div>

          <ThemeToggle />

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Site navigation</SheetTitle>
              <nav
                aria-label="Mobile"
                className="mt-14 flex flex-col items-stretch gap-1"
              >
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-12 items-center rounded-md px-3 text-lg font-medium text-foreground/85 transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}

                <div className="mt-4 pt-4 border-t border-border">
                  {session?.user ? (
                    <Link
                      href={"/account" as Route}
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-12 items-center gap-2.5 rounded-md px-3 text-base font-semibold text-primary transition-colors hover:bg-secondary"
                    >
                      <User className="size-4" />
                      <span>My Bookings</span>
                    </Link>
                  ) : (
                    <Link
                      href={"/login" as Route}
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-12 items-center gap-2.5 rounded-md px-3 text-base font-medium text-foreground/85 transition-colors hover:bg-secondary"
                    >
                      <LogIn className="size-4" />
                      <span>Sign in</span>
                    </Link>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
