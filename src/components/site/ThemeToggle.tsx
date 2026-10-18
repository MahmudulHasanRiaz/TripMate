"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY } from "@/lib/theme";

type Theme = "light" | "dark";

/**
 * Dark-mode switch. The `.dark` class lives on <html>; the initial value is
 * set BEFORE first paint by the pre-paint inline script in the root layout
 * (reads THEME_STORAGE_KEY, falls back to prefers-color-scheme), so this
 * island only ever corrects itself to the class that already exists — no FOUC,
 * no hydration mismatch. The DOM class is the source of truth for toggling,
 * and the choice is persisted to localStorage for the next load.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Read the class the pre-paint script already applied to <html>. This is
    // deliberate external-DOM synchronization: the server cannot know the saved
    // theme, so a lazy useState initializer would cause a hydration mismatch.
    // The sync setState runs once, after hydration, to correct the icon.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  }, []);

  function toggle() {
    const next: Theme = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setTheme(next);
  }

  // SSR + first client render both paint the "switch to dark" affordance;
  // the effect above then corrects the icon after mount. No hydration error.
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 cursor-pointer items-center justify-center rounded-xl border border-border/70 bg-card/70 text-foreground transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}
