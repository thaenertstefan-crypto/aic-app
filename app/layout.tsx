import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/web-app-manifest-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF2E6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
