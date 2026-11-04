import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Initialize Cloudflare context bindings during `next dev`
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence unnecessary warnings in edge environments
  serverExternalPackages: ["pg"],
  // Disable webpack disk caching during production builds so oversized cache files (.pack > 25 MiB) are never generated
  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
