"use client";

import Image from "next/image";
import { useState } from "react";
import { CARD_SIZES, recentProductClick } from "@/lib/product-transition";

/**
 * Shown the instant a product link is clicked, while the server renders the
 * page. Mirrors the PDP layout and, when the shopper came from a card, shows
 * that card's photo — already in the browser cache — in the gallery slot.
 */
export default function ProductPageSkeleton() {
  // Read once on mount: the click happened just before this rendered.
  const [clicked] = useState(recentProductClick);
  const bar = "bg-ink/10 motion-safe:animate-pulse";

  return (
    <main className="container-x py-10" aria-busy="true" aria-label="Loading product">
      <div className={`mb-8 h-3 w-48 ${bar}`} />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-[3/4] overflow-hidden bg-cream-dark">
          {clicked && (
            <Image
              src={clicked.src}
              alt=""
              fill
              sizes={CARD_SIZES}
              placeholder={clicked.blurDataUrl ? "blur" : "empty"}
              blurDataURL={clicked.blurDataUrl ?? undefined}
              className="object-cover"
            />
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div className={`h-3 w-24 ${bar}`} />
          <div className={`h-12 w-3/4 ${bar}`} />
          <div className={`h-5 w-20 ${bar}`} />
          <div className={`mt-4 h-16 w-full max-w-md ${bar}`} />
          <div className={`mt-4 h-12 w-full max-w-sm ${bar}`} />
        </div>
      </div>
    </main>
  );
}
