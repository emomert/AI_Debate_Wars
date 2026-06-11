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
        "caret-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "thinking-bounce": {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "40%": { transform: "translateY(-4px)", opacity: "1" },
        },
        // Angry rattle for the hidden UNHINGED tone when it unlocks.
        shake: {
          "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
          "15%": { transform: "translateX(-5px) rotate(-1.5deg)" },
          "30%": { transform: "translateX(5px) rotate(1.5deg)" },
          "45%": { transform: "translateX(-4px) rotate(-1deg)" },
          "60%": { transform: "translateX(4px) rotate(1deg)" },
          "75%": { transform: "translateX(-2px) rotate(-0.5deg)" },
        },
      },
      animation: {
        "caret-blink": "caret-blink 1.05s ease-in-out infinite",
        "thinking-bounce": "thinking-bounce 1.2s ease-in-out infinite",
        shake: "shake 0.55s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
