"use client";

import Image from "next/image";
import { useState } from "react";
import { CARD_SIZES, HERO_SIZES } from "@/lib/product-transition";

export default function Gallery({
  images,
  blurs = [],
  name,
}: {
  images: string[];
  /** Blur placeholder per image (same order as `images`). */
  blurs?: (string | null)[];
  name: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div
        className="aspect-[3/4] bg-cream-dark"
        role="img"
        aria-label={`${name} — no image available`}
      />
    );
  }

  const activeImage = images[selectedIndex] ?? images[0];
  const activeBlur = blurs[selectedIndex] ?? null;

  return (
    <div>
      {/* `relative` is required for next/image `fill` to size against this box. */}
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-dark">
        {/* Underlay: the same card-sized copy the catalogue already loaded
            (shared CARD_SIZES → same srcset pick → browser cache hit), so a
            shopper arriving from a card sees the photo at once. Its blur
            placeholder covers a cold cache. The full hero paints over it. */}
        <Image
          key={`under-${activeImage}`}
          src={activeImage}
          alt=""
          aria-hidden="true"
          fill
          loading="eager"
          sizes={CARD_SIZES}
          placeholder={activeBlur ? "blur" : "empty"}
          blurDataURL={activeBlur ?? undefined}
          className="object-cover"
        />
        {/* PDP LCP element — eager. */}
        <Image
          src={activeImage}
          alt={`${name} view ${selectedIndex + 1}`}
          fill
          priority
          sizes={HERO_SIZES}
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div
          className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5"
          role="group"
          aria-label={`${name} image thumbnails`}
        >
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              aria-current={i === selectedIndex}
              aria-pressed={i === selectedIndex}
              aria-label={`View image ${i + 1} of ${images.length}`}
              className={`relative aspect-[3/4] overflow-hidden bg-cream-dark transition-colors ${
                i === selectedIndex
                  ? "border-2 border-ink"
                  : "border border-ink/15 hover:border-ink/40"
              }`}
            >
              <Image
                src={img}
                alt=""
                aria-hidden="true"
                fill
                sizes="(max-width: 1024px) 25vw, 12vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
