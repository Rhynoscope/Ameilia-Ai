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
  themeColor: "#261c7a",
};

export const metadata: Metadata = {
  title: "Ameilia AI — Personal Relationship Companion & Multiplayer Dates",
  description:
    "An intelligent relationship companion, texting coach, and playable multiplayer Virtual Dates arcade for you and Amelia.",
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
      <body className="antialiased min-h-dvh flex flex-col text-gray-900">
        <ServiceWorkerRegistration />
        <DemoModeBanner />
        <Navbar />
        <main className="flex-1 flex flex-col min-h-0">{children}</main>
        <InstallPwaBanner />
      </body>
    </html>
  );
}
