"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/products";

export default function AddToCart({ product }: { product: Product }) {
  const { addItem } = useCart();

  const allSoldOut =
    product.variants.length === 0 ||
    product.variants.every((v) => v.stock === 0);

  // Only auto-select a lone size when it is actually in stock.
  const [size, setSize] = useState<string | null>(
    product.variants.length === 1 && product.variants[0].stock > 0
      ? product.variants[0].size
      : null,
  );
  const [error, setError] = useState(false);

  function handleAdd() {
    const selected = product.variants.find((v) => v.size === size);
    // Block if nothing selected or the selected size is sold out (defends against
    // a size chosen before its stock dropped to 0).
    if (!selected || selected.stock === 0) {
      setError(true);
      return;
    }
    addItem({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images[0],
      size: selected.size,
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow">Size</p>
        {error && !size && (
          <span className="text-xs text-sepia">Select a size</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {product.variants.map((v) => {
          const soldOut = v.stock === 0;
          return (
            <button
              key={v.size}
              type="button"
              disabled={soldOut}
              aria-label={soldOut ? `${v.size} (sold out)` : v.size}
              onClick={() => {
                if (soldOut) return;
                setSize(v.size);
                setError(false);
              }}
              className={`min-w-12 border px-4 py-2.5 text-sm transition-colors ${
                soldOut
                  ? "cursor-not-allowed border-ink/10 text-ink/30 line-through"
                  : size === v.size
                    ? "border-ink bg-ink text-cream"
                    : "border-ink/25 text-ink hover:border-ink"
              }`}
            >
              {v.size}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleAdd}
        disabled={allSoldOut}
        className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {allSoldOut ? "Sold out" : "Add to cart"}
      </button>
    </div>
  );
}
