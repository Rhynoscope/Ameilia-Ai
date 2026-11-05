import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { InstallPwaBanner } from "@/components/InstallPwaBanner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Ameilia AI — Personal Relationship Companion",
  description:
    "An intelligent, unified relationship companion and texting coach to communicate consistently, naturally, and warmly with Amelia across the distance.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ameilia AI",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-dvh flex flex-col bg-white text-gray-900 selection:bg-pink-100 selection:text-romantic-700">
        <ServiceWorkerRegistration />
        <DemoModeBanner />
        <Navbar />
        <main className="flex-1 flex flex-col min-h-0">{children}</main>
        <InstallPwaBanner />
      </body>
    </html>
  );
}
