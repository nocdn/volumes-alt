import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: [
    "metascraper",
    "metascraper-title",
    "metascraper-logo-favicon",
    "url-regex-safe",
    "re2",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Keep native re2 out of the bundle; load it at runtime instead.
      config.externals = config.externals || [];
      config.externals.push("re2");
    }
    return config;
  },
};

export default nextConfig;
