import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true, // Ignores TypeScript errors during build
  },
};

export default nextConfig;
