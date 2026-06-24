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
      // Übungen nach /booster migriert (Bug 7)
      {
        source: "/recipes/overthinking",
        destination: "/booster/overthinking",
        permanent: false,
      },
      { source: "/cleansers", destination: "/booster", permanent: false },
      {
        source: "/cleansers/confidence",
        destination: "/booster/confidence",
        permanent: false,
      },
      {
        source: "/cleansers/mantra",
        destination: "/booster/mantra",
        permanent: false,
      },
      {
        source: "/cleansers/promises",
        destination: "/booster/promises",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
