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
        // Two faces, split by job. `serif` (Bodoni Moda) is the VOICE — the
        // wordmark, section headlines, product names. `sans` (Inter) is the
        // READING face and the default on <body>, so every paragraph, label,
        // control, price and nav link lands on it without being marked up.
        //
        // They were briefly the same stack, with Bodoni doing body text too.
        // A didone sets its identity in the contrast between hairline and
        // stem, and at 11–16px the hairline is under a device pixel and
        // vanishes — the type went faint and had to be propped up with
        // semibold weights and near-black greys that a grotesque never needs.
        serif: ["var(--font-bodoni)", "Didot", "Bodoni MT", "Georgia", "serif"],
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
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
