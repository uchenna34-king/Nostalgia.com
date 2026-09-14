import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic, variable-backed. `cream` is the page surface and `ink` the
        // primary content colour — in dark mode the variables swap, so every
        // existing `bg-cream` / `text-ink` usage inverts without being rewritten.
        // Light-mode values are byte-identical to the locked palette, so the
        // Phase 10 contrast work is preserved exactly.
        cream: "rgb(var(--c-cream) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        sepia: "rgb(var(--c-sepia) / <alpha-value>)",
        // AA-passing siblings of the locked sepia accent, for contexts where
        // #A6552F cannot reach 4.5:1 (WCAG 1.4.3). The accent itself is
        // unchanged — these are used only where measurement showed a failure.
        // sepia-deep on cream 6.15:1, on cream-dark 5.37:1 (was 4.59 / 4.01).
        // sepia-light on ink   5.28:1 (was 3.28).
        "sepia-deep": "rgb(var(--c-sepia-deep) / <alpha-value>)",
        "sepia-light": "rgb(var(--c-sepia-light) / <alpha-value>)",
        "cream-dark": "rgb(var(--c-cream-dark) / <alpha-value>)",
        "ink-soft": "rgb(var(--c-ink-soft) / <alpha-value>)",

        // Fixed, non-swapping. Photography must be darkened in BOTH themes, so
        // scrims over images use these rather than the semantic pair — a scrim
        // that inverts would wash the photo light in dark mode.
        shade: "#141210",
        light: "#F6F1E8",
      },
      fontFamily: {
        serif: ["var(--font-bodoni)", "Didot", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        marquee: "marquee 24s linear infinite",
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
