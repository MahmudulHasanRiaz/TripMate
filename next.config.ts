import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// Ensure process.env is populated from .env/.env.local at config evaluation time
loadEnvConfig(process.cwd());

// When storage is r2 the media driver returns ABSOLUTE urls on the operator's
// custom domain (R2_PUBLIC_URL), so every public next/image <img> optimization
// request to that host would 400 unless it is whitelisted here. The env is read
// at CONFIG time (build-time), so production builds need R2_PUBLIC_URL set when
// storage=r2 — a Vercel project env var / Docker build arg (see README). The
// host is parsed via `new URL(...)` so a value like https://cdn.example.com
// yields just its hostname for the pattern. A malformed value must NOT crash
// config load — it is warned about and treated as absent.
const r2Hostname = readR2Hostname();

/** Hostname of R2_PUBLIC_URL, or null when unset / whitespace / unparseable. */
function readR2Hostname(): string | null {
  const value = process.env.R2_PUBLIC_URL?.trim();
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    // Operators paste BARE hostnames (cdn.example.com), which new URL rejects —
    // fail soft (pattern omitted) with a clear message rather than crash the
    // build. URL values like https://cdn.example.com parse fine.
    console.warn(
      `[config] R2_PUBLIC_URL is set but is not a valid absolute URL ("${value}") — ` +
        "R2 image remote pattern omitted. Set it to e.g. https://cdn.example.com when storage=r2.",
    );
    return null;
  }
}

/**
 * Dev-only origins allowed to fetch dev assets / HMR / RSC payloads.
 *
 * ROOT CAUSE of "works on localhost, dead buttons on mobile via tunnel":
 * Next.js blocks cross-origin requests to dev-only endpoints by default. When
 * the dev server is opened through a tunnel domain (e.g.
 * https://mac.riaz.com.bd -> localhost:3000), the browser origin no longer
 * matches the server's init hostname, so chunk/HMR/RSC fetches are rejected,
 * hydration never completes, and every client island (ThemeToggle, mobile
 * menu, TravelActionPanel tabs, service cards) stays dead — clicks do nothing.
 * Desktop on http://localhost:3000 keeps working because the origin matches.
 *
 * Fix: whitelist the tunnel host (+ common tunnel wildcards). Entries are
 * bare hostnames (docs: allowedDevOrigins.md). APP_URL's hostname and
 * ALLOWED_DEV_ORIGINS (comma-separated, e.g. "mac.example.com,*.example.com")
 * are merged in automatically so operators never edit this file per tunnel.
 */
function readAllowedDevOrigins(): string[] {
  const defaults = [
    "mac.riaz.com.bd",
    "*.riaz.com.bd",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.loca.lt",
    "*.cfargotunnel.com",
  ];
  const fromEnv =
    process.env.ALLOWED_DEV_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  let fromAppUrl: string[] = [];
  try {
    const raw = process.env.APP_URL?.trim();
    if (raw) {
      const host = new URL(raw).hostname.trim();
      if (host) fromAppUrl = [host];
    }
  } catch {
    // Invalid APP_URL is reported by src/lib/env.ts validation — ignore here.
  }
  return [...new Set([...defaults, ...fromEnv, ...fromAppUrl])];
}

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Tunnel fix (mobile dead buttons): Next.js blocks cross-origin fetches of
  // dev-only assets/HMR/RSC payloads. When the dev server is opened via
  // https://mac.riaz.com.bd -> localhost:3000, HTML loads but JS chunks are
  // rejected, hydration never completes and every client island stays dead.
  allowedDevOrigins: readAllowedDevOrigins(),
  async redirects() {
    return [
      // §2.3: evergreen pages moved /p/[slug] → /{slug}. Config-level
      // permanent redirect so backlinks/search equity survive regardless of
      // prerender behavior; unknown slugs 404 naturally at the root route.
      { source: "/p/:slug*", destination: "/:slug*", permanent: true },
    ];
  },
  // Emit a self-contained .next/standalone bundle (server.js + traced
  // node_modules) for the Docker image, which copies it into its runner
  // stage (see Dockerfile). On Vercel the standalone folder is ignored AND
  // enabling it crashes Turbopack NFT tracing under the Vercel adapter
  // (ENOENT .next/next-server.js.nft.json — the generator skips that file
  // when an adapter is configured), so it is disabled there via VERCEL.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  // Next 16 Cache Components: single unified flag that turns on the
  // `use cache` directive, cacheTag/cacheLife, and Partial Prerendering (PPR)
  // as the App Router default. See node_modules/next/dist/docs/.../cacheComponents.md
  cacheComponents: true,
  experimental: {
    serverActions: {
      // Media uploads ride server actions as multipart FormData. Next's default
      // 1MB body cap would reject the library's 25MiB ceiling before the action
      // runs. The cap is set a MiB ABOVE the per-file limit on purpose: the raw
      // HTTP body includes multipart boundaries/part headers, so a file exactly
      // at the 25MiB validation cap would otherwise be rejected at transport
      // (the installed serverActions docs warn to leave headroom). The media
      // action still enforces the real 25 MiB limit — see media/validation.ts.
      bodySizeLimit: "26mb",
    },
  },
  images: {
    remotePatterns: [
      // Direct Cloudflare R2 public bucket endpoints
      { protocol: "https", hostname: "*.r2.dev", pathname: "/**" },
      // R2-backed imagery when custom R2_PUBLIC_URL is configured (see top of file)
      ...(r2Hostname
        ? [{ protocol: "https" as const, hostname: r2Hostname, pathname: "/**" }]
        : []),
    ],
  },
};

export default nextConfig;
