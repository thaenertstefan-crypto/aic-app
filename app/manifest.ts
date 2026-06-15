import type { MetadataRoute } from "next";

// Served by Next at /manifest.webmanifest; the <link rel="manifest"> tag is
// auto-injected. Colors mirror the design tokens in app/globals.css
// (--background: oklch(0.97 0.025 65) → warm cream).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anti Imposter Club",
    short_name: "AIC",
    description: "Dein Begleiter für mehr Selbstbewusstsein",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FAF2E6",
    theme_color: "#FAF2E6",
    icons: [
      {
        src: "/icons/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
