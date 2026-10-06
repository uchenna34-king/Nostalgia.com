"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { preloadProductHero, rememberProductClick } from "@/lib/product-transition";

/**
 * Link to a product page that warms it up: hover/focus/touch starts the hero
 * photo download, and the click hands the card's photo to the PDP loading
 * skeleton so the shopper sees the picture immediately.
 */
export default function ProductLink({
  slug,
  image,
  blurDataUrl,
  className,
  children,
}: {
  slug: string;
  image: string | undefined;
  blurDataUrl: string | null | undefined;
  className?: string;
  children: ReactNode;
}) {
  const warm = () => image && preloadProductHero(image);
  return (
    <Link
      href={`/product/${slug}`}
      className={className}
      onPointerEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      onClick={() => image && rememberProductClick(image, blurDataUrl ?? null)}
    >
      {children}
    </Link>
  );
}
