import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        museum: {
          bg: "#0d0c0a",
          "bg-elevated": "#161412",
          surface: "#1e1b18",
          "surface-hover": "#252220",
          spotlight: "#FFD8A8",
          amber: "#FFC997",
          accent: "#FFD8A8",
          "accent-hover": "#FFC997",
          text: "#f5f0e6",
          muted: "#8c8577",
          dim: "#6b6560",
        },
      },
    },
  },
  plugins: [],
};

export default config;
