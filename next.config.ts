import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Next 16 Cache Components: single unified flag that turns on the
  // `use cache` directive, cacheTag/cacheLife, and Partial Prerendering (PPR)
  // as the App Router default. See node_modules/next/dist/docs/.../cacheComponents.md
  cacheComponents: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
    ],
  },
};

export default nextConfig;
