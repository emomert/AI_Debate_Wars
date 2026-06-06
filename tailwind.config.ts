import type { Config } from "tailwindcss";

/**
 * Design tokens are defined here so that every component speaks the same
 * arcade visual language (docs/02_DESIGN.md). UI components should reference
 * these semantic tokens (e.g. `border-ink`, `bg-paper`, `shadow-hard`) rather
 * than hard-coding hex values.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Adaptive tokens — RGB triplets live in globals.css (:root / .dark) so
        // every existing `border-ink`, `bg-paper`, `text-ink/60`… flips with the
        // theme while keeping alpha-modifier support.
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        card: "rgb(var(--c-card) / <alpha-value>)",
        /** Neutral "white" surface (chips, selector cards) — darkens in dark mode. */
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        /** Constant near-black — black chips + text on bright arcade colors. */
        night: "#050505",
        dot: "rgb(var(--c-dot) / <alpha-value>)",
        arcade: {
          yellow: "#FFD91A",
          green: "#4CAF50",
          blue: "#3B82F6",
          red: "#FF4D4D",
          pink: "#FF75C3",
          purple: "#8B5CF6",
          orange: "#FF9F1C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderWidth: {
        "3": "3px",
        "5": "5px",
      },
      borderRadius: {
        badge: "10px",
        btn: "14px",
        card: "18px",
        panel: "24px",
        modal: "28px",
      },
      boxShadow: {
        // Ink shadows route through a CSS var so they flip with the theme
        // (light: #050505, dark: #f0efe8 — see globals.css).
        hard: "6px 6px 0 var(--shadow-ink)",
        "hard-sm": "3px 3px 0 var(--shadow-ink)",
        "hard-lg": "8px 8px 0 var(--shadow-ink)",
        "hard-pressed": "2px 2px 0 var(--shadow-ink)",
        "hard-blue": "6px 6px 0 #1d4ed8",
        "hard-red": "6px 6px 0 #c81e1e",
        "hard-purple": "6px 6px 0 #6d28d9",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "caret-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "thinking-bounce": {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "40%": { transform: "translateY(-4px)", opacity: "1" },
        },
        "float-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.92)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "caret-blink": "caret-blink 1.05s ease-in-out infinite",
        "thinking-bounce": "thinking-bounce 1.2s ease-in-out infinite",
        "float-soft": "float-soft 3s ease-in-out infinite",
        "pop-in": "pop-in 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
