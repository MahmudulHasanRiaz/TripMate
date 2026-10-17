import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  typedRoutes: true,
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
      // R2-backed imagery when R2_PUBLIC_URL is configured (see top of file).
      // Zero third-party runtime image domains permitted on public site.
      ...(r2Hostname
        ? [{ protocol: "https" as const, hostname: r2Hostname, pathname: "/**" }]
        : []),
    ],
  },
};

export default nextConfig;
