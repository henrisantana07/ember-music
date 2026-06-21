import type { NextConfig } from "next";

let nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'usercontent.jamendo.com' },
      { protocol: 'https', hostname: 'prod-1.storage.jamendo.com' },
    ],
  },
};

export default nextConfig;
