import localFont from "next/font/local";

/**
 * The single house face. Per the brand direction, Bodoni Moda is used for
 * EVERYTHING — display, body, and UI — so there is no second typeface loaded.
 * The 400–700 range carries body, labels, emphasis, and the wordmark. It is a
 * high-contrast didone: thin at small sizes, so body copy leans on the 400
 * weight and a comfortable line-height.
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
