import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/recipes", destination: "/dashboard", permanent: false },
      { source: "/recipes/values", destination: "/me/values", permanent: false },
      {
        source: "/recipes/values/hypothesis",
        destination: "/me/values/journey/hypothesis",
        permanent: false,
      },
      {
        source: "/recipes/values/journal",
        destination: "/me/values/journey/journal",
        permanent: false,
      },
      {
        source: "/recipes/values/evaluation",
        destination: "/me/values/journey/evaluation",
        permanent: false,
      },
      {
        source: "/recipes/bill-of-rights",
        destination: "/me/bill-of-rights",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
