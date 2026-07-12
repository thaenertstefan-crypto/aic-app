import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Aktiviert Reacts <ViewTransition> für den Sternschmiede-Übergang.
    viewTransition: true,
  },
  // Basis-Härtung für alle Responses. Bewusst OHNE strikte Content-Security-
  // Policy: die bräuchte in Next.js Nonce-Handling für Inline-Scripts —
  // Aufwand/Risiko lohnt für diese App aktuell nicht.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Verhindert das Einbetten der App in fremde iframes (Clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Browser dürfen Content-Types nicht erraten (MIME-Sniffing).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Volle Referrer-URL nur same-origin, sonst nur der Origin.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Die App nutzt keine dieser Browser-Features — explizit abschalten.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
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
      { source: "/recipes/wants", destination: "/me/wants", permanent: false },
      // Übungen nach /booster migriert (Bug 7)
      {
        source: "/recipes/overthinking",
        destination: "/booster/overthinking",
        permanent: false,
      },
      {
        source: "/recipes/saying-no",
        destination: "/booster/saying-no",
        permanent: false,
      },
      // Der /recipes-Bereich ist retired (Übungen leben unter /me & /booster).
      // Fängt alle verbliebenen/alten Slugs ab (shadow, things-got-messy, …),
      // damit gelöschte Rezept-Routen nicht 404en. Muss NACH den spezifischen
      // /recipes/*-Regeln stehen — erster Treffer gewinnt.
      { source: "/recipes/:path*", destination: "/me", permanent: false },
      { source: "/cleansers", destination: "/booster", permanent: false },
      {
        source: "/cleansers/confidence",
        destination: "/booster/confidence",
        permanent: false,
      },
      {
        source: "/cleansers/mantra",
        destination: "/booster/confidence",
        permanent: false,
      },
      // Mantra Cleanser + Showstopper Confidence zum Confidence-Boost fusioniert
      {
        source: "/booster/mantra",
        destination: "/booster/confidence",
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
