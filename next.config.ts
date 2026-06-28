import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

const withAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

let nextConfig: NextConfig = {
  compress: true,
  logging: {
    fetches: { fullUrl: true },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn-images.dzcdn.net' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'zustand', 'fast-average-color'],
  },
};

export default withAnalyzer(nextConfig);
