import type { MetadataRoute } from "next";

// Served by Next at /manifest.webmanifest; the <link rel="manifest"> tag is
// auto-injected. Colors mirror the design tokens in app/globals.css
// (--background: #1B1726 → "Dusk Membership" dark palette).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anti Imposter Club",
    short_name: "Anti Imposter Club",
    description: "Dein Begleiter für mehr Selbstbewusstsein",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#1B1726",
    theme_color: "#1B1726",
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
        src: "/icons/web-app-manifest-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
