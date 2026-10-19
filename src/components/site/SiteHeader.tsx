"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { LogIn, Menu, Phone, Sparkles, User, X } from "lucide-react";

import { cn } from "@/lib/utils";
import Logo from "@/components/icons/Logo";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "./ThemeToggle";

export type PublicNavItem = {
  label: string;
  href: Route;
};

const NAV_ITEMS: PublicNavItem[] = [
  { label: "Packages", href: "/packages" as Route },
  { label: "Visa Services", href: "/visa" as Route },
  { label: "Blog", href: "/blog" as Route },
  { label: "About", href: "/about-us" as Route },
];

export type SiteHeaderProps = {
  title: string;
  logoUrl: string;
  phone?: string;
  overHero?: boolean;
};

export function SiteHeader({ title, logoUrl, phone }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cleanPhone = phone ? phone.replace(/[^0-9+]/g, "") : "";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open — otherwise the fixed
  // header + page scroll fight on touch devices and taps feel "dead".
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  // Close the mobile menu on route change / Escape so a stale open menu
  // never traps touches after navigation (mobile browsers keep the header
  // mounted across navigations).
  const pathname = usePathname();
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  return (
    <header className="fixed top-2.5 sm:top-4 inset-x-0 mx-auto w-[calc(100%-1.25rem)] sm:w-[calc(100%-2.5rem)] max-w-6xl z-50 transition-all duration-300">
      {/* Floating Island Container */}
      <div
        className={cn(
          "relative flex items-center justify-between rounded-2xl border px-3 sm:px-5 transition-all duration-300",
          "bg-background/90 dark:bg-card/85 backdrop-blur-xl",
          scrolled
            ? "py-2 sm:py-2.5 border-border shadow-xl shadow-black/10 dark:shadow-black/40 ring-1 ring-border/50"
            : "py-2.5 sm:py-3 border-border/70 shadow-lg shadow-black/5 dark:shadow-black/20",
        )}
      >
        {/* Brand Logo & Name */}
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5 group">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-6 w-auto" />
            ) : (
              <Logo className="size-5" aria-hidden="true" />
            )}
          </span>
          <div className="flex flex-col">
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-foreground leading-tight">
              {title}
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-foreground/85 transition-all duration-150 hover:bg-primary/10 hover:text-primary active:scale-95"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Call / WhatsApp */}
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone.replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
            >
              <Phone className="size-3" />
              <span>Concierge</span>
            </a>
          )}

          {/* User Auth or Account — session is isolated in its own island so a
              slow/failing /api/auth/session fetch on a tunnel domain can never
              throw the whole header (menu + theme toggle) into a dead state. */}
          <div className="hidden sm:flex items-center">
            <Suspense
              fallback={
                <span className="h-8 w-20 animate-pulse rounded-xl bg-muted/70" aria-hidden="true" />
              }
            >
              <HeaderSessionDesktop />
            </Suspense>
          </div>

          {/* Theme Switcher Toggle */}
          <ThemeToggle />

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-panel"
            className="flex size-9 cursor-pointer touch-manipulation items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors lg:hidden"
          >
            {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Floating Sub-Card for Mobile Navigation (Never a jarring flat sheet) */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-panel"
          className="mt-2 overflow-hidden rounded-2xl border border-border bg-background/95 dark:bg-card/95 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-3 duration-200 lg:hidden">
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <span>{item.label}</span>
                <span className="text-muted-foreground text-xs">→</span>
              </Link>
            ))}

            <div className="mt-2 pt-3 border-t border-border flex flex-col gap-2">
              <Suspense
                fallback={
                  <span className="h-10 w-full animate-pulse rounded-xl bg-muted/70" aria-hidden="true" />
                }
              >
                <HeaderSessionMobile onNavigate={() => setMobileMenuOpen(false)} />
              </Suspense>

              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone.replace("+", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Phone className="size-3.5" />
                  <span>Chat on WhatsApp ({phone})</span>
                </a>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/**
 * Session-dependent header links, isolated as their own client islands.
 *
 * ROOT CAUSE of the "dead header on mobile via tunnel" report: this used to
 * live inline in SiteHeader via `authClient.useSession()`. On a tunnel domain
 * (https://mac.riaz.com.bd -> localhost:3000) the session fetch runs against
 * a different origin than the dev server's init host / better-auth baseURL,
 * so it can suspend, hang, or throw — and because it shared the header's
 * render scope, the failure took down the menu button and ThemeToggle with
 * it (clicks did nothing). Wrapped in <Suspense> here, a failing session
 * degrades to Sign-in instead of a dead header.
 */
function HeaderSessionDesktop() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role || "";
  if (session?.user) {
    return (
      <div className="flex items-center gap-1.5">
        {["superadmin", "admin", "staff"].includes(role) && (
          <Link
            href={"/admin" as Route}
            className="flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
          >
            <Sparkles className="size-3" />
            <span>Admin</span>
          </Link>
        )}
        <Link
          href={"/account" as Route}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary hover:border-primary/40 transition-all"
        >
          <User className="size-3.5 text-primary" />
          <span>My Portal</span>
        </Link>
      </div>
    );
  }
  return (
    <Link
      href={"/login" as Route}
      className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
    >
      <LogIn className="size-3.5" />
      <span>Sign in</span>
    </Link>
  );
}

function HeaderSessionMobile({ onNavigate }: { onNavigate: () => void }) {
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role || "";
  if (session?.user) {
    return (
      <>
        {["superadmin", "admin", "staff"].includes(role) && (
          <Link
            href={"/admin" as Route}
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            <Sparkles className="size-4" />
            <span>Admin Dashboard</span>
          </Link>
        )}
        <Link
          href={"/account" as Route}
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
        >
          <User className="size-4 text-primary" />
          <span>My Bookings &amp; Portal</span>
        </Link>
      </>
    );
  }
  return (
    <Link
      href={"/login" as Route}
      onClick={onNavigate}
      className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
    >
      <LogIn className="size-4" />
      <span>Sign In to Account</span>
    </Link>
  );
}
