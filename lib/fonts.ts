import { Bodoni_Moda, Inter } from "next/font/google";

/**
 * Bodoni Moda is the house face — the wordmark spec is "Bodoni Moda at 400,
 * tracking -0.015em, the ® raised to the cap line" and every display line on
 * the site is set in it. High-contrast didone: the thin/thick stroke split is
 * the whole identity, so it is only ever used at display scale, never for body.
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

/**
 * The single neutral grotesque that carries everything the didone does not —
 * body copy, the letterspaced micro-labels, controls. Kept deliberately quiet
 * so the wordmark is the only thing with a voice.
 */
export const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
