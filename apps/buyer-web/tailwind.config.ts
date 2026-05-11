import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)"],
        rajdhani: ["var(--font-rajdhani)"],
        bebas: ["var(--font-bebas)"],
      },
      colors: {
        primary: {
          DEFAULT: "#00D1FF",
          glow: "rgba(0, 209, 255, 0.4)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
