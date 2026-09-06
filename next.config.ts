import type { NextConfig } from "next";

// When storage is r2 the media driver returns ABSOLUTE urls on the operator's
// custom domain (R2_PUBLIC_URL), so every public next/image <img> optimization
// request to that host would 400 unless it is whitelisted here. The env is read
// at CONFIG time (build-time), so production builds need R2_PUBLIC_URL set when
// storage=r2 — a Vercel project env var / Docker build arg (see README). The
// host is parsed via `new URL(...)` so a value like https://cdn.example.com
// yields just its hostname for the pattern.
const r2Hostname = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : null;

const nextConfig: NextConfig = {
  typedRoutes: true,
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
      { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
      // R2-backed imagery when R2_PUBLIC_URL is configured (see top of file).
      ...(r2Hostname
        ? [{ protocol: "https" as const, hostname: r2Hostname, pathname: "/**" }]
        : []),
    ],
  },
};

export default nextConfig;
