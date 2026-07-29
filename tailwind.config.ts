import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F4EEE4",
        ink: "#1A1A1A",
        sepia: "#A6552F",
        // AA-passing siblings of the locked sepia accent, for contexts where
        // #A6552F cannot reach 4.5:1 (WCAG 1.4.3). The accent itself is
        // unchanged — these are used only where measurement showed a failure.
        // sepia-deep on cream 6.15:1, on cream-dark 5.37:1 (was 4.59 / 4.01).
        // sepia-light on ink   5.28:1 (was 3.28).
        "sepia-deep": "#8A4524",
        "sepia-light": "#C97A4A",
        "cream-dark": "#E8DFCF",
        "ink-soft": "#3A3A3A",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
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
