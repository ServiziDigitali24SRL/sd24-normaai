import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light theme tokens
        bg: "#F7F5F2",
        sidebar: "#EFEDE8",
        accent: "#E8340A",
        "accent-hover": "#c42d08",
        gold: "#B8860B",
        card: "#FFFFFF",
        "card-border": "#E5E1D8",
        "input-bg": "#F0EDE8",
        "input-border": "#D5D0C8",
        cream: "#1a1a1a",      // testo principale (era il colore testo chiaro sul dark)
        muted: "#6B6763",      // testo secondario
        surface: "#FAFAF8",    // superfici elevate
      },
      fontFamily: {
        serif: ["DM Serif Display", "Georgia", "serif"],
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
