import type { NextConfig } from "next";

let nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'usercontent.jamendo.com' },
      { protocol: 'https', hostname: 'prod-1.storage.jamendo.com' },
    ],
  },
};

if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true })
  nextConfig = withBundleAnalyzer(nextConfig)
}

export default nextConfig;
