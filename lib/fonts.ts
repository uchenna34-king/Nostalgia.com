import localFont from "next/font/local";

/**
 * The display face — the house voice. Bodoni Moda carries the wordmark, every
 * section headline, and product names, and nothing else. It is a high-contrast
 * didone, which is exactly why it is confined to display sizes: the thin/thick
 * stroke split that makes it read as a fashion house is the same thing that
 * makes it fall apart under ~20px. See `inter` below for the reading face.
 *
 * The files are vendored in app/fonts rather than pulled with
 * next/font/google ON PURPOSE. next/font/google downloads the face from
 * fonts.gstatic.com at COMPILE time, so with no network `npm run dev` fails
 * while compiling the root layout — and because the failure is at layout
 * level it takes down every route with a 500 that app/error.tsx cannot catch
 * (only app/global-error.tsx can). Vendoring removes that build-time network
 * dependency, so dev and `next build` work identically offline and online.
 *
 * These are the variable (400..700) latin-subset files from the same Google
 * release, so the rendered type is unchanged. To refresh them, re-download
 * the latin blocks of:
 * https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700
 *
 * Next cannot compute automatic fallback metrics for Bodoni Moda ("Failed to
 * find font override values"), and left on it errors the render. We supply an
 * explicit fallback stack instead, so there is a defined face to swap from.
 */
export const bodoni = localFont({
  src: [
    {
      path: "../app/fonts/BodoniModa-latin-normal.woff2",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "../app/fonts/BodoniModa-latin-italic.woff2",
      weight: "400 700",
      style: "italic",
    },
  ],
  variable: "--font-bodoni",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Didot", "Bodoni MT", "Georgia", "serif"],
});

/**
 * The reading face. Bodoni is a didone: its identity IS the hairline/stem
 * contrast, and at 11–16px those hairlines fall below one device pixel and
 * drop out — which is why the house style sheet already said "a didone at
 * body size is unreadable" while the code was setting every paragraph, label,
 * nav link and price in it. Inter is the correction: a neutral grotesque with
 * a tall x-height and open apertures, which is the same structural choice the
 * resale houses make (The RealReal sets Suisse Int'l, Farfetch a Nimbus Sans
 * cut) — an editorial serif for the voice, a quiet grotesque for the reading.
 *
 * Bodoni keeps everything it was good at: the wordmark, display, and every
 * section headline. Inter takes body, controls, labels, and data.
 *
 * Vendored for the same reason as Bodoni — next/font/google resolves at
 * COMPILE time, so a networkless `npm run dev` fails while building the root
 * layout and takes every route down with it. This is the variable latin
 * subset (opsz 14..32, wght 400..700) from the Google release; to refresh it,
 * re-download the latin block of:
 * https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700
 *
 * No italic file is shipped: nothing in the product sets body italic, and an
 * unused 70KB face is 70KB of preload. Add the italic src here if that changes.
 */
export const inter = localFont({
  src: [
    {
      path: "../app/fonts/Inter-latin-normal.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

/**
 * Inter's latin-ext subset, for the naira sign (₦, U+20A6) and accented
 * letters, which the latin file above doesn't contain — without it every ₦
 * price fell back to a system face (D-FONT-1). Same Google release; to
 * refresh it, take the latin-ext block of the css2 URL above.
 *
 * It sits FIRST in the sans stack (tailwind.config.ts), ahead of
 * var(--font-inter). next/font expands that variable to include its fallbacks
 * (Arial, system-ui…), which would catch ₦ before an extension listed after
 * it. Its unicode-range keeps it off plain Latin, and with no fallbacks of its
 * own, the variable expands to this face alone. No preload: the browser
 * fetches it only when a page shows a character in its range.
 */
export const interExt = localFont({
  src: [
    {
      path: "../app/fonts/Inter-latin-ext-normal.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-inter-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: [],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
});

