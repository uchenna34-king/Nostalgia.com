"use client";

import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import { formatPrice } from "@/lib/products";

export default function WishlistPage() {
  const { items, remove, count } = useWishlist();

  if (items.length === 0) {
    return (
      <main className="container-x flex min-h-[50vh] flex-col items-center justify-center gap-5 py-20 text-center">
        <h1 className="font-serif text-4xl font-black">Your wishlist is empty</h1>
        <p className="text-ink-soft">Nothing saved yet. Let&apos;s change that.</p>
        <Link href="/shop" className="btn-primary">
          Browse the collection
        </Link>
      </main>
    );
  }

  return (
    <main className="container-x py-14">
      <h1 className="mb-10 font-serif text-5xl font-black">
        Your wishlist ({count})
      </h1>

      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.slug} className="group">
            <Link href={`/product/${item.slug}`} className="block">
              <div className="relative aspect-[3/4] overflow-hidden bg-cream-dark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <h3 className="font-serif text-lg leading-tight">{item.name}</h3>
                <span className="text-sm text-ink-soft">
                  {formatPrice(item.price)}
                </span>
              </div>
            </Link>
            <button
              onClick={() => remove(item.slug)}
              className="mt-2 text-sm text-ink-soft underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
