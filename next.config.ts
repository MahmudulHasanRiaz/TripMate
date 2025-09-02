
import type {NextConfig} from 'next';

const r2Hostname = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : undefined;

const remotePatterns = [
  {
    protocol: 'https',
    hostname: 'placehold.co',
    port: '',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
    port: '',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'images.pexels.com',
    port: '',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'i1.sndcdn.com',
    port: '',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'lh3.googleusercontent.com',
    port: '',
    pathname: '/**',
  },
   {
    protocol: 'https',
    hostname: '**.fbcdn.net',
    port: '',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'scontent.fdac19-1.fna.fbcdn.net',
    port: '',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'pbs.twimg.com',
    port: '',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'pub-9059dbcadb0c4bc2ab655eb20c8299a4.r2.dev',
    port: '',
    pathname: '/**',
  }
];

if (r2Hostname) {
  remotePatterns.push({
    protocol: 'https',
    hostname: r2Hostname,
    port: '',
    pathname: '/**',
  });
}


const nextConfig: NextConfig = {
  experimental: {
    // This is required to allow the Next.js dev server to work inside of
    // Firebase Studio. This is not needed for production builds.
    allowedDevOrigins: ['*.cloudworkstations.dev'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns,
  },
};

export default nextConfig;
