import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { NavigationSpinner } from "@/components/layout/navigation-spinner";
import { GrainOverlay } from "@/components/ui/grain-overlay";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anti Imposter Club",
  description:
    "Dein persönlicher Begleiter für mehr Selbstvertrauen — mit interaktiven Übungen aus dem Anti-Imposter-Workbook.",
  appleWebApp: {
    capable: true,
    title: "AIC",
    // "black-translucent" lets the web content (incl. the fixed AppBackdrop)
    // extend full-bleed under the status bar so the ambient blobs render behind
    // the clock/wifi instead of a flat aubergine band.
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#161226",
  // Let content flow into the safe areas (notch) so env(safe-area-inset-*) works.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ScrollToTop />
        <NavigationSpinner />
        <ServiceWorkerRegistration />
        {children}
        <GrainOverlay />
      </body>
    </html>
  );
}
