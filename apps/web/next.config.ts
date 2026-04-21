import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trading-helper/core", "@trading-helper/ai"]
};

export default nextConfig;
