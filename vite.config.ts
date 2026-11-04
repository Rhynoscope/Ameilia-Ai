import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      configPath: "./wrangler.vinext.jsonc",
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  ssr: {
    external: ["pg", "pg-native"],
  },
  build: {
    rollupOptions: {
      external: ["pg", "pg-native"],
    },
  },
});
