"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/products";

export default function AddToCart({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState<string | null>(
    product.sizes.length === 1 ? product.sizes[0] : null,
  );
  const [error, setError] = useState(false);

  function handleAdd() {
    if (!size) {
      setError(true);
      return;
    }
    addItem({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images[0],
      size,
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
        {product.sizes.map((s) => (
          <button
            key={s}
            onClick={() => {
              setSize(s);
              setError(false);
            }}
            className={`min-w-12 border px-4 py-2.5 text-sm transition-colors ${
              size === s
                ? "border-ink bg-ink text-cream"
                : "border-ink/25 text-ink hover:border-ink"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <button onClick={handleAdd} className="btn-primary mt-6 w-full">
        Add to cart
      </button>
    </div>
  );
}
