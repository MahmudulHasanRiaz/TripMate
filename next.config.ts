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
      // 1MB body cap would reject the library's 25MB ceiling before the action
      // runs; this lifts the REQUEST cap to match (the media action still
      // enforces the real per-file limit — see media/validation.ts). The extra
      // headroom absorbs multipart boundary overhead.
      bodySizeLimit: "25mb",
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
