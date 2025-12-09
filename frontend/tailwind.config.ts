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
        glass: {
          100: "rgba(255, 255, 255, 0.03)",
          200: "rgba(255, 255, 255, 0.08)",
          border: "rgba(255, 255, 255, 0.08)",
          highlight: "rgba(255, 255, 255, 0.15)",
        },
        neon: {
          indigo: "#6366f1",
          cyan: "#06b6d4",
          rose: "#f43f5e",
          emerald: "#10b981",
        },
      },
      boxShadow: {
        glass: "0 4px 30px rgba(0, 0, 0, 0.1)",
        "neon-blue": "0 0 20px rgba(99, 102, 241, 0.4)",
        "neon-green": "0 0 20px rgba(16, 185, 129, 0.4)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
