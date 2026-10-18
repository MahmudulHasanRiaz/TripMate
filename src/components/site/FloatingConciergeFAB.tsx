"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

type FloatingConciergeFABProps = {
  phone?: string;
};

export function FloatingConciergeFAB({ phone = "+880 1700-000000" }: FloatingConciergeFABProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  useEffect(() => {
    const handleScroll = () => {
      // Show FAB after scrolling down 250px
      if (window.scrollY > 250) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isDismissed || !isVisible) return null;

  const waUrl = `https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent("Salam TripMate, I need assistance with Umrah / Flight / Hotel booking.")}`;

  return (
    <div
      role="region"
      aria-label="Quick Concierge Support"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 shadow-2xl shadow-emerald-900/30 transition-all duration-200 hover:scale-105 active:scale-95 border border-emerald-400/30"
      >
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-white" />
        </span>
        <MessageCircle className="size-4 shrink-0 transition-transform group-hover:scale-110" />
        <span className="text-xs font-bold tracking-wide">
          <span className="hidden sm:inline">Concierge Online · </span>Chat Now
        </span>
      </a>

      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss concierge button"
        className="flex size-7 items-center justify-center rounded-full bg-card/80 text-muted-foreground hover:text-foreground backdrop-blur-md border border-border shadow-md transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
