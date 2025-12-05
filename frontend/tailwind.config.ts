import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "mae-grid",
    "layout-shell",
    "command-surface",
    "command-inner",
    "command-columns",
    "glass-panel",
    "panel-border",
    "pill",
    "kpi-card",
    "text-gradient",
    "spark-line",
    "callout",
    "mae-button",
    "mae-button primary",
    "mae-button ghost",
    "avatar-stack",
    "timeline",
    "timeline-item",
    "topbar-shell",
    "status-grid",
    "status-card",
    "topbar-nav",
    "topbar-subnav",
    "footer-pill",
    "footer-pill-content",
    "footer-pill-meta",
    "footer-pill-nav",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0F172A",
        secondary: "#334155",
        accent: "#2563EB",
      },
    },
  },
  plugins: [],
};
export default config;
