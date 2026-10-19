"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  resolveChatChannels,
  type ContactChannels,
} from "./contact-channels";

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

  if (items.length === 0 || !visible) return null;

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
  if (kind === "whatsapp") return <MessageCircle className="size-5" aria-hidden="true" />;
  if (kind === "call") return <Phone className="size-5" aria-hidden="true" />;
  if (kind === "messenger") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-5">
        <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.25.35.25.57l.05 1.78c.02.41.45.63.78.42l2.03-1.32c.15-.1.34-.13.52-.08 1.07.31 2.2.47 3.38.47 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm2.9 6.6-2.6 4.11c-.42.66-1.32.83-1.94.36l-2.02-1.5a.62.62 0 0 0-.73 0l-2.78 2.1c-.55.42-1.28-.25-.87-.8l2.6-4.11c.42-.66 1.32-.83 1.94-.36l2.02 1.5c.2.15.48.15.68.01l2.83-2.11c.55-.41 1.28.25.87.8z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-5">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38A5.88 5.88 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13.67.66 1.34 1.08 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.88 5.88 0 0 0 2.13-1.38 5.88 5.88 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.88 5.88 0 0 0-1.38-2.13A5.88 5.88 0 0 0 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.15A4 4 0 1 1 16 12a4 4 0 0 1-4 3.99zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
    </svg>
  );
}
