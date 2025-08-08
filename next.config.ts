import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['placehold.co'],
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
  experimental: {
    optimizePackageImports: [
      'react',
      'react-dom',
    ],
  },
};

export default nextConfig;