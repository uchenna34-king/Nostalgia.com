import { getImageProps } from "next/image";

/**
 * Makes catalogue → product-page feel instant.
 *
 * The card and the PDP request different widths of the same photo. Sharing
 * these `sizes` strings lets the PDP (and its loading skeleton) paint the
 * card-sized copy the browser already has, while the larger hero loads over
 * it. Hovering or touching a card starts the hero download before the click.
 */

/** Product grid card. The PDP underlay reuses it so the browser cache hits. */
export const CARD_SIZES = "(max-width: 768px) 50vw, 25vw";
/** PDP main image. */
export const HERO_SIZES = "(max-width: 1024px) 100vw, 50vw";

type ClickedProduct = { src: string; blurDataUrl: string | null; at: number };

// Module scope lives for the whole client session, across App Router
// navigations — exactly the span between a card click and the PDP render.
let lastClick: ClickedProduct | null = null;
const preloaded = new Set<string>();

export function rememberProductClick(src: string, blurDataUrl: string | null) {
  lastClick = { src, blurDataUrl, at: Date.now() };
}

/** The photo from the card just clicked, if that click was a moment ago. */
export function recentProductClick(): ClickedProduct | null {
  return lastClick && Date.now() - lastClick.at < 10_000 ? lastClick : null;
}

export function preloadProductHero(src: string) {
  if (!src || preloaded.has(src) || typeof window === "undefined") return;
  preloaded.add(src);
  const { props } = getImageProps({ src, alt: "", fill: true, sizes: HERO_SIZES });
  const img = new window.Image();
  // sizes + srcset before src, so the browser picks the same candidate the
  // PDP's <img> will ask for and the click lands on a cache hit.
  if (props.sizes) img.sizes = props.sizes;
  if (props.srcSet) img.srcset = props.srcSet;
  img.src = props.src;
}
