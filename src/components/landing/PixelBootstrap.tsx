"use client";

import { useEffect } from "react";

type PixelBootstrapProps = {
  pixelId?: string | null;
};

/**
 * Client-side Meta Pixel bootstrapper.
 * Runs strictly on the client and only when a valid pixelId is passed from the server.
 * Never reads process.env directly on the client.
 */
export function PixelBootstrap({ pixelId }: PixelBootstrapProps) {
  useEffect(() => {
    if (!pixelId || typeof window === "undefined") return;

    // Check if fbq is already defined
    if ((window as unknown as { fbq?: unknown }).fbq) return;

    // Standard Meta Pixel snippet
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const f: any = function (...args: any[]) {
      if (f.callMethod) {
        f.callMethod(...args);
      } else {
        f.queue.push(args);
      }
    };
    f.push = f;
    f.loaded = true;
    f.version = "2.0";
    f.queue = [];
    (window as any).fbq = f;
    (window as any)._fbq = f;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }

    f("init", pixelId);
    f("track", "PageView");
  }, [pixelId]);

  return null;
}
