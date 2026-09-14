import { Bodoni_Moda } from "next/font/google";

/**
 * The single house face. Per the brand direction, Bodoni Moda is used for
 * EVERYTHING — display, body, and UI — so there is no second typeface loaded.
 * The 300/400 weights carry body and labels; 500–700 carry emphasis and the
 * wordmark. High-contrast didone: thin at small sizes, so body copy leans on
 * the 400 weight and a comfortable line-height.
 */
export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-bodoni",
  display: "swap",
  // Next cannot compute automatic fallback metrics for Bodoni Moda ("Failed to
  // find font override values"), and left on it errors the render. We supply an
  // explicit fallback stack instead, so there is a defined face to swap from.
  adjustFontFallback: false,
  fallback: ["Didot", "Bodoni MT", "Georgia", "serif"],
});
