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
        bg: "#0D0D0D",
        sidebar: "#111111",
        accent: "#E8340A",
        "accent-hover": "#c42d08",
        gold: "#F5C842",
        card: "#181818",
        "card-border": "#222222",
        "input-bg": "#1c1c1c",
        "input-border": "#252525",
        cream: "#F0EEE8",
      },
      fontFamily: {
        serif: ["Instrument Serif", "serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
