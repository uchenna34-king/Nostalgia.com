"use client";

import Image from "next/image";
import { useState } from "react";

export default function Gallery({
  images,
  name,
}: {
  images: string[];
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

  return (
    <div>
      {/* `relative` is required for next/image `fill` to size against this box. */}
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-dark">
        {/* PDP LCP element — eager. */}
        <Image
          src={activeImage}
          alt={`${name} view ${selectedIndex + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover transition-opacity duration-300 ease-out motion-reduce:transition-none"
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
