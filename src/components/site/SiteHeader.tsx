"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { ChevronDown, ExternalLink, LogIn, Menu, Sparkles, User, X } from "lucide-react";

import { WhatsAppIcon } from "./brand-icons";

import { cn } from "@/lib/utils";
import Logo from "@/components/icons/Logo";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import { FALLBACK_NAV, type NavEntry } from "./nav-model";

export type PublicNavItem = {
  label: string;
  href: Route;
};

export type SiteHeaderProps = {
  title: string;
  logoUrl: string;
  /** Optional light/white lockup for dark mode (Follow-up 11). */
  logoDarkUrl?: string;
  /** Brand lockup mode (settings): "logo-only" renders one wide lockup
   *  image alone; anything else is the classic icon + title. */
  logoDisplay?: "icon-name" | "logo-only";
  phone?: string;
  overHero?: boolean;
  /** Was a session resolves server-side? Drives Sign-in vs portal links. */
  signedIn: boolean;
  /**
   * May this session open /admin (ADMIN_PANEL_ROLES)? Derived SERVER-side in
   * the (public) layout — never from the client session fetch, so a cached
   * or flaky client session can never show an Admin button to a customer.
   */
  canAccessAdmin: boolean;
  /**
   * Data-driven menu tree (FU-33): built SERVER-side by the (public)
   * layout gate from the tenant's live catalog (buildNavModel), so every
   * service, package category and destination is reachable from the nav.
   * Optional — standalone renders that cannot fetch the catalog (the 404
   * page) omit it and render the structural FALLBACK_NAV links instead.
   */
  nav?: NavEntry[];
};

export function SiteHeader({ title, logoUrl, logoDarkUrl, logoDisplay, phone, signedIn, canAccessAdmin, nav = FALLBACK_NAV }: SiteHeaderProps) {
  // Logo-only needs an actual logo image; without one the classic lockup
  // (default mark + title) is the honest fallback — never an empty slot.
  const logoOnly = logoDisplay === "logo-only" && Boolean(logoUrl);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  /** Desktop drop-down currently open (group label), if any (FU-33). */
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  /** Mobile accordion section currently expanded (group label) (FU-33). */
  const [openMobileSection, setOpenMobileSection] = useState<string | null>(null);
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

  // Close the mobile menu on route change. Render-time adjustment instead of
  // an effect: a stale open menu never traps touches after navigation (mobile
  // browsers keep the header mounted across navigations) without the
  // cascading render an effect-on-pathname causes.
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setMobileMenuOpen(false);
    setOpenGroup(null);
    setOpenMobileSection(null);
  }
  useEffect(() => {
    if (!mobileMenuOpen && !openGroup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setOpenGroup(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen, openGroup]);

  // Desktop drop-downs also close on any pointer-down outside them, so a
  // click elsewhere on the page never leaves a panel floating open.
  useEffect(() => {
    if (!openGroup) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest("[data-nav-group]")) {
        setOpenGroup(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [openGroup]);

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
        {/* Brand lockup — settings-driven (Follow-up 09 §3): logo-only
            shows the wide lockup image alone; icon-name is the classic
            disc + title. The title stays the img alt either way. */}
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5 group">
          {logoOnly ? (
            <BrandLogo
              logoUrl={logoUrl}
              logoDarkUrl={logoDarkUrl}
              title={title}
              priority
              className="h-8 w-auto max-w-[180px] object-contain sm:h-9 sm:max-w-[210px]"
            />
          ) : (
            <>
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
            </>
          )}
        </Link>

        {/* Center Desktop Navigation — data-driven tree (FU-33): groups
            open a drop-down panel (hover, click or keyboard), flat
            entries render as plain links exactly as before. */}
        <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1">
          {nav.map((entry) =>
            entry.kind === "link" ? (
              <Link
                key={`${entry.label}-${entry.href}`}
                href={entry.href as Route}
                className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-foreground/85 transition-all duration-150 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95"
              >
                {entry.label}
              </Link>
            ) : (
              <DesktopNavGroup
                key={entry.label}
                entry={entry}
                open={openGroup === entry.label}
                onOpen={() => setOpenGroup(entry.label)}
                onClose={() => setOpenGroup((g) => (g === entry.label ? null : g))}
                onToggle={() => setOpenGroup((g) => (g === entry.label ? null : entry.label))}
              />
            ),
          )}
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
              <WhatsAppIcon className="size-3.5" />
              <span>Concierge</span>
            </a>
          )}

          {/* User Auth or Account — signedIn/canAccessAdmin are resolved by
              the server (SiteHeaderGate in the (public) layout), so no client
              session fetch can flake here; the Admin link only exists when
              the session's role is in ADMIN_PANEL_ROLES. Customers, logged in
              or not, never receive it — the markup isn't even sent. */}
          {!signedIn ? (
            <Link
              href={"/login" as Route}
              className="hidden sm:inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              <LogIn className="size-3.5" />
              <span>Sign in</span>
            </Link>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5">
              {canAccessAdmin && (
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
          )}

          {/* Theme Switcher Toggle */}
          <ThemeToggle />

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((o) => !o);
              setOpenMobileSection(null);
            }}
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
            {nav.map((entry) =>
              entry.kind === "link" ? (
                <Link
                  key={`${entry.label}-${entry.href}`}
                  href={entry.href as Route}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <span>{entry.label}</span>
                  <span className="text-muted-foreground text-xs">→</span>
                </Link>
              ) : (
                <MobileNavGroup
                  key={entry.label}
                  entry={entry}
                  open={openMobileSection === entry.label}
                  onToggle={() =>
                    setOpenMobileSection((s) => (s === entry.label ? null : entry.label))
                  }
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              ),
            )}

            <div className="mt-2 pt-3 border-t border-border flex flex-col gap-2">
              {!signedIn ? (
                <Link
                  href={"/login" as Route}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <LogIn className="size-4" />
                  <span>Sign In to Account</span>
                </Link>
              ) : (
                <>
                  {canAccessAdmin && (
                    <Link
                      href={"/admin" as Route}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Sparkles className="size-4" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
                  <Link
                    href={"/account" as Route}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <User className="size-4 text-primary" />
                    <span>My Bookings &amp; Portal</span>
                  </Link>
                </>
              )}

              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone.replace("+", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <WhatsAppIcon className="size-4" />
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

/** Drop-down rows: ≥40px tall, 14px text, AA on the island surface. */
const DESKTOP_ITEM_CLS =
  "flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground/85 transition-colors duration-150 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

/**
 * One desktop drop-down group (FU-33). Disclosure pattern: the trigger
 * is a button with aria-expanded; the panel opens on hover (mouseenter
 * on the whole wrapper, so trigger → panel travel never drops it), on
 * click, and stays open while focus is anywhere inside the wrapper —
 * tabbing past the last item closes it via the blur check. Escape
 * closes and returns focus to the trigger. The "All …" index link is
 * the panel's first row, set apart by a divider.
 */
function DesktopNavGroup({
  entry,
  open,
  onOpen,
  onClose,
  onToggle,
}: {
  entry: Extract<NavEntry, { kind: "group" }>;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  /**
   * FU-34 — hover/click race guard. A pointer click on the trigger is
   * ALWAYS preceded by mouseenter, which has already hover-opened the
   * group; if that click then hit the parent's blind toggle, it would
   * shut the panel in the same gesture and the menu would never open
   * on the first click (proven by live QA — touch taps hit the same
   * path via synthesised mouseenter). So: when the current open came
   * from hover during this pointer visit, the first click is CONSUMED
   * (panel stays open) and only spends this flag; the next click,
   * pointer still over the group, toggles shut as expected. Keyboard
   * clicks involve no hover, so the flag is unset and Enter/Space
   * toggles exactly as before. Do NOT simplify this back to wiring the
   * trigger's onClick straight to onToggle.
   */
  const openedByHoverRef = useRef(false);
  // Keep the flag truthful across closes that bypass the pointer
  // (Escape, outside pointer-down, blur, route change): once closed,
  // no stale "hover opened this" may survive into the next gesture.
  useEffect(() => {
    if (!open) openedByHoverRef.current = false;
  }, [open]);
  const panelId = `nav-panel-${entry.label.toLowerCase()}`;

  const handleMouseEnter = () => {
    openedByHoverRef.current = true;
    onOpen();
  };
  const handleMouseLeave = () => {
    openedByHoverRef.current = false;
    onClose();
  };
  const handleTriggerClick = () => {
    if (openedByHoverRef.current) {
      openedByHoverRef.current = false;
      return;
    }
    onToggle();
  };
  return (
    <div
      data-nav-group
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={handleTriggerClick}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-foreground/85 transition-all duration-150 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          open && "bg-primary/10 text-primary",
        )}
      >
        {entry.label}
        <ChevronDown
          className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 animate-in fade-in slide-in-from-top-1 pt-2 duration-150">
          <ul
            id={panelId}
            aria-label={entry.label}
            className="max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-background/95 p-1.5 shadow-2xl backdrop-blur-2xl dark:bg-card/95"
          >
            {entry.items.map((item, idx) => (
              <li
                key={`${item.label}-${item.href}`}
                className={cn(idx === 0 && "mb-1 border-b border-border/60 pb-1")}
              >
                {item.external ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className={DESKTOP_ITEM_CLS}
                  >
                    <span className="flex-1">{item.label}</span>
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </a>
                ) : (
                  <Link
                    href={item.href as Route}
                    onClick={onClose}
                    className={cn(DESKTOP_ITEM_CLS, idx === 0 && "font-semibold text-foreground")}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Accordion rows inside the mobile panel: ≥40px tall, 14px text. */
const MOBILE_ITEM_CLS =
  "flex min-h-10 items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary";

/**
 * One mobile accordion section (FU-33): a header row toggles the group
 * with the same 200ms motion language as the desktop chevron; the body
 * expands via the grid-rows trick so the height animates smoothly
 * without measuring. Collapsed rows leave the tab order (tabIndex -1).
 */
function MobileNavGroup({
  entry,
  open,
  onToggle,
  onNavigate,
}: {
  entry: Extract<NavEntry, { kind: "group" }>;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const panelId = `mobile-nav-section-${entry.label.toLowerCase()}`;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full cursor-pointer touch-manipulation items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <span>{entry.label}</span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-0.5 pb-1 pl-3">
            {entry.items.map((item) =>
              item.external ? (
                <a
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={open ? undefined : -1}
                  onClick={onNavigate}
                  className={MOBILE_ITEM_CLS}
                >
                  <span>{item.label}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </a>
              ) : (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href as Route}
                  tabIndex={open ? undefined : -1}
                  onClick={onNavigate}
                  className={MOBILE_ITEM_CLS}
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground" aria-hidden="true">
                    →
                  </span>
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

