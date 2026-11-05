"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Absolute URL for a media file: R2 rows already store one; local rows
 *  store `/uploads/...` and need the current origin in front. */
export function absoluteMediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Copy with a fallback for non-secure contexts where the async clipboard
 *  API is unavailable. Returns whether the copy landed. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Copy-this-file's-URL button (FU-13). `icon` is the compact card variant;
 * `labeled` is the detail dialog's full button. Feedback is the icon swap
 * to a check for ~2s — no toast needed for such a small, certain action.
 */
export default function CopyUrlButton({
  url,
  name,
  variant = "icon",
  className,
}: {
  url: string;
  name: string;
  variant?: "icon" | "labeled";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyText(absoluteMediaUrl(url));
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "labeled") {
    return (
      <Button
        type="button"
        variant="outline"
        className={cn("h-10 shrink-0 gap-1.5 rounded-lg text-sm font-semibold", className)}
        onClick={(e) => void copy(e)}
      >
        {copied ? (
          <Check className="h-4 w-4 text-primary" aria-hidden="true" />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden="true" />
        )}
        {copied ? "Copied" : "Copy URL"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className={cn("h-8 w-8 rounded-lg shadow-xs", className)}
      aria-label={`Copy URL of ${name}`}
      title="Copy URL"
      onClick={(e) => void copy(e)}
    >
      {copied ? (
        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
      ) : (
        <Link2 className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
