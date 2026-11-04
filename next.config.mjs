import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Initialize Cloudflare context bindings during `next dev`
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence unnecessary warnings in edge environments
  serverExternalPackages: ["pg"],
};

export default nextConfig;
