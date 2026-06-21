import type { NextConfig } from "next";

let nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn-images.dzcdn.net' },
    ],
  },
};

export default nextConfig;
