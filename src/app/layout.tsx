import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { DemoModeBanner } from "@/components/DemoModeBanner";

export const metadata: Metadata = {
  title: "Amelia AI — Personal Relationship Companion",
  description: "An intelligent, unified relationship companion and texting coach to communicate consistently, naturally, and warmly with Amelia.",
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-white text-gray-900 selection:bg-pink-100 selection:text-romantic-700">
        <DemoModeBanner />
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
