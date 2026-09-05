import type { NextConfig } from "next";

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
    ],
  },
};

export default nextConfig;
