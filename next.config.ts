import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    scrollRestoration: true,
    inlineCss: true,
  },
};

export default nextConfig;
