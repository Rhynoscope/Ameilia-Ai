import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        romantic: {
          50: "#fff1f5",
          100: "#ffe4ec",
          200: "#fecddb",
          300: "#fea3be",
          400: "#fb7185",
          500: "#f43f7a",
          600: "#e11d62",
          700: "#be124d",
          800: "#9f1244",
          900: "#84143d",
          950: "#49061d",
        },
        pastelPink: {
          50: "#fff5f7",
          100: "#ffe8ed",
          200: "#ffd1dc",
          300: "#ffb4c5",
        },
        charcoal: {
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
          950: "#030712",
        },
      },
      backgroundImage: {
        "romantic-gradient": "linear-gradient(135deg, #f43f7a 0%, #fb7185 100%)",
        "soft-pink-gradient": "linear-gradient(135deg, #fff1f5 0%, #ffe4ec 100%)",
        "card-gradient": "linear-gradient(180deg, #ffffff 0%, #fffdfd 100%)",
      },
      boxShadow: {
        "soft-pink": "0 4px 20px -2px rgba(244, 63, 122, 0.08)",
        "hover-pink": "0 10px 25px -3px rgba(244, 63, 122, 0.15)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-subtle": "bounce 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
