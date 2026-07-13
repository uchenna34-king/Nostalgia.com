"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/products";

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, count } = useCart();

  if (items.length === 0) {
    return (
      <main className="container-x flex min-h-[50vh] flex-col items-center justify-center gap-5 py-20 text-center">
        <h1 className="font-serif text-4xl font-black">Your bag is empty</h1>
        <p className="text-ink-soft">Nothing kept yet. Let&apos;s change that.</p>
        <Link href="/shop" className="btn-primary">
          Browse the collection
        </Link>
      </main>
    );
  }

  return (
    <main className="container-x py-14">
      <h1 className="mb-10 font-serif text-5xl font-black">Your bag ({count})</h1>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Line items */}
        <div className="lg:col-span-2">
          {items.map((item) => (
            <div
              key={`${item.slug}-${item.size}`}
              className="flex gap-5 border-b border-ink/10 py-6"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name}
                className="h-36 w-28 object-cover"
              />
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between">
                  <Link
                    href={`/product/${item.slug}`}
                    className="font-serif text-xl"
                  >
                    {item.name}
                  </Link>
                  <span>{formatPrice(item.price * item.qty)}</span>
                </div>
                <p className="text-sm text-ink-soft">Size {item.size}</p>
                <div className="mt-auto flex items-center gap-6">
                  <div className="flex items-center border border-ink/20">
                    <button
                      className="px-3 py-1.5"
                      onClick={() => updateQty(item.slug, item.size, item.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-10 text-center">{item.qty}</span>
                    <button
                      className="px-3 py-1.5"
                      onClick={() => updateQty(item.slug, item.size, item.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.slug, item.size)}
                    className="text-sm text-ink-soft underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-ink/15 p-6">
            <h2 className="font-serif text-2xl">Summary</h2>
            <div className="mt-5 flex justify-between text-sm text-ink-soft">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-ink-soft">
              <span>Shipping</span>
              <span>{subtotal >= 20000 ? "Free" : "Calculated at checkout"}</span>
            </div>
            <div className="mt-5 flex justify-between border-t border-ink/10 pt-5 text-lg">
              <span className="font-serif">Total</span>
              <span className="font-serif">{formatPrice(subtotal)}</span>
            </div>
            <Link href="/checkout" className="btn-primary mt-6 w-full">
              Proceed to checkout
            </Link>
            <Link
              href="/shop"
              className="mt-3 block text-center text-xs uppercase tracking-[0.18em] text-ink-soft underline"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
