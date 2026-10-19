"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { MessageCircle, Phone } from "lucide-react";

import { InstagramIcon, MessengerIcon, WhatsAppIcon } from "./brand-icons";

import { cn } from "@/lib/utils";
import {
  resolveChatChannels,
  type ContactChannels,
} from "./contact-channels";

/**
 * Routes where the page ships its OWN pinned bottom action bar (price + Book
 * + Call + WhatsApp) — the global widget would stack a second floating
 * column on top of it and crowd the same corner (Follow-up 08). Keep this
 * list in sync with any future page that renders a full-width fixed bottom
 * bar:
 *  - /packages/[slug]  → <PackageMobileBar /> (fixed inset-x-0 bottom-0 <lg)
 *  - /l/[slug]         → LandingRenderer's fixed bottom CTA strip
 */
const WIDGET_SUPPRESSED_ROUTE_PATTERNS = [/^\/packages\/[^/]+/, /^\/l\/[^/]+/];

/**
 * pathname reader that NEVER touches the prerender-sensitive flight path
 * (usePathname() under Cache Components must be inside <Suspense>; our plain
 * layout render should not pay that tax). Reading window.location via
 * useSyncExternalStore keeps the widget a pure Client Content leaf:
 *  - SSR snapshot is "" → not suppressed → the widget renders (and promptly
 *    returns null anyway because the FAB appears only after scrolling)
 *  - soft navigations notify through popstate plus a one-time history shim
 */
const pathnameListeners = new Set<() => void>();
let historyPatched = false;

function notifyPathnameListeners() {
  for (const listener of pathnameListeners) listener();
}

function patchHistoryOnce() {
  if (historyPatched) return;
  historyPatched = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method].bind(window.history) as (
      data: unknown,
      unused: string,
      url?: string | URL,
    ) => void;
    window.history[method] = ((
      data: unknown,
      unused: string,
      url?: string | URL,
    ) => {
      original(data, unused, url);
      notifyPathnameListeners();
    }) as typeof window.history.pushState;
  }
}

function subscribePathname(callback: () => void) {
  patchHistoryOnce();
  pathnameListeners.add(callback);
  window.addEventListener("popstate", callback);
  return () => {
    pathnameListeners.delete(callback);
    window.removeEventListener("popstate", callback);
  };
}

const getClientPathname = () => window.location.pathname;
const getServerPathname = () => "";

export type { ContactChannels };

type ChatWidgetProps = {
  channels: ContactChannels;
  siteName?: string;
};

/**
 * Floating "rain fan-out" chat widget — 100% settings-driven.
 *
 * Closed: a single circular FAB (bottom-right). Open: channel icons burst out
 * upward with staggered spring transitions — WhatsApp, Messenger, Call,
 * Instagram in configured order. Only configured channels render; zero
 * channels → the FAB hides entirely. Responsive: 56px FAB + 48px channel
 * buttons (≥44px targets), touch-manipulation, Escape/backdrop closes, focus
 * returns to the FAB, prefers-reduced-motion respected.
 */
export function ChatWidget({ channels, siteName }: ChatWidgetProps) {
  const items = resolveChatChannels(channels);
  const pathname = useSyncExternalStore(
    subscribePathname,
    getClientPathname,
    getServerPathname,
  );
  // Pages with their own pinned bottom bar own the "book/call/chat" moment;
  // the global widget deliberately disappears there instead of fighting it
  // for the same corner of the screen.
  const suppressed = WIDGET_SUPPRESSED_ROUTE_PATTERNS.some((p) =>
    p.test(pathname ?? ""),
  );
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 250);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    fabRef.current?.focus();
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: PointerEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !fabRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  if (items.length === 0 || !visible || suppressed) return null;

  const brand = siteName?.trim() ? ` · ${siteName.trim()}` : "";

  return (
    <div
      role="region"
      aria-label={`Quick contact${brand}`}
      className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
    >
      <div
        ref={panelRef}
        id={labelId}
        aria-hidden={!open}
        className={cn(
          "flex flex-col items-end gap-2.5",
          !open && "pointer-events-none",
        )}
      >
        {items.map((item, i) => (
          <a
            key={item.key}
            href={item.href}
            target={item.key === "call" ? undefined : "_blank"}
            rel={item.key === "call" ? undefined : "noopener noreferrer"}
            tabIndex={open ? 0 : -1}
            aria-label={`Contact via ${item.label}${brand}`}
            title={item.label}
            style={{ transitionDelay: open ? `${i * 45}ms` : "0ms" }}
            className={cn(
              "group flex touch-manipulation items-center gap-2.5 transition-all duration-300 ease-out",
              "motion-reduce:transition-none motion-reduce:transform-none",
              open
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-4 scale-50 opacity-0",
            )}
          >
            <span className="pointer-events-none rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md">
              {item.label}
            </span>
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-full text-white shadow-xl transition-transform duration-200 group-hover:scale-110 group-active:scale-95",
                item.key === "whatsapp" && "bg-emerald-600 shadow-emerald-900/30 hover:bg-emerald-700",
                item.key === "messenger" && "bg-info shadow-blue-900/30 hover:bg-info/90",
                item.key === "call" && "bg-primary shadow-primary/30 hover:opacity-90",
                item.key === "instagram" &&
                  "bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 shadow-pink-900/30 hover:opacity-95",
              )}
            >
              <ChannelIcon kind={item.key} />
            </span>
          </a>
        ))}
      </div>
      <button
        ref={fabRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={labelId}
        aria-label={open ? "Close contact options" : `Open contact options${brand}`}
        className={cn(
          "relative flex size-14 cursor-pointer touch-manipulation items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-2xl transition-all duration-200",
          "hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          open && "rotate-90",
        )}
      >
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex size-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-3.5 rounded-full border-2 border-background bg-emerald-500" />
          </span>
        )}
        {open ? (
          <span aria-hidden="true" className="text-2xl font-light leading-none">+</span>
        ) : (
          <MessageCircle className="size-6" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function ChannelIcon({ kind }: { kind: "whatsapp" | "messenger" | "call" | "instagram" }) {
  // WhatsApp/Messenger/Instagram carry the OFFICIAL brand glyphs (see
  // brand-icons.tsx); they are brand claims, not generic symbols. The call
  // channel is a plain phone action, so lucide's Phone stays appropriate
  // there — it is not a brand mark.
  if (kind === "whatsapp") return <WhatsAppIcon className="size-5" />;
  if (kind === "call") return <Phone className="size-5" aria-hidden="true" />;
  if (kind === "messenger") return <MessengerIcon className="size-5" />;
  return <InstagramIcon className="size-5" />;
}
