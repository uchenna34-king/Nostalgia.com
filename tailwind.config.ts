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
        // Legacy names from the retired sepia accent — they now resolve to
        // neutral greys (see globals.css) so the palette is black and white
        // only. Kept so the component tree needs no rewrite.
        "sepia-deep": "rgb(var(--c-sepia-deep) / <alpha-value>)",
        "sepia-light": "rgb(var(--c-sepia-light) / <alpha-value>)",
        "cream-dark": "rgb(var(--c-cream-dark) / <alpha-value>)",
        "ink-soft": "rgb(var(--c-ink-soft) / <alpha-value>)",

        // Fixed, non-swapping. Photography must be darkened in BOTH themes, so
        // scrims over images use these rather than the semantic pair — a scrim
        // that inverts would wash the photo light in dark mode.
        shade: "#000000",
        light: "#FFFFFF",
      },
      fontFamily: {
        // One face for the entire site, by direction: Bodoni Moda is used for
        // body and UI as well as display, so `sans` and `serif` resolve to the
        // same stack. Every default-body, `font-sans`, and `font-serif` usage
        // therefore lands on Bodoni — no second typeface anywhere.
        serif: ["var(--font-bodoni)", "Didot", "Georgia", "serif"],
        sans: ["var(--font-bodoni)", "Didot", "Georgia", "serif"],
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
