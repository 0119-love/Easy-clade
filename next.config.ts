import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // lucide-react/recharts are tree-shaken by Next's own default list
    // already; @lobehub/icons (provider brand marks, used on nearly every
    // dashboard page via ProviderMark) isn't on that list, so without this
    // every page pulls in more of the icon set than the handful it uses.
    optimizePackageImports: ["@lobehub/icons"],
  },
};

export default nextConfig;
