"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/products";

export default function CartDrawer() {
  const { items, isOpen, closeDrawer, updateQty, removeItem, subtotal, count } =
    useCart();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className={`fixed inset-0 z-[60] bg-ink/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col bg-cream shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <h2 className="font-serif text-2xl">Your bag ({count})</h2>
          <button onClick={closeDrawer} aria-label="Close cart" className="text-2xl">
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-ink-soft">Your bag is empty.</p>
            <Link href="/shop" onClick={closeDrawer} className="btn-outline">
              Browse the collection
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.map((item) => (
                <div
                  key={`${item.slug}-${item.size}`}
                  className="flex gap-4 border-b border-ink/10 py-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-24 w-20 object-cover"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between">
                      <h3 className="font-serif text-base leading-tight">
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeItem(item.slug, item.size)}
                        className="text-xs text-ink-soft underline"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-xs text-ink-soft">Size {item.size}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center border border-ink/20">
                        <button
                          className="px-2.5 py-1"
                          onClick={() =>
                            updateQty(item.slug, item.size, item.qty - 1)
                          }
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center text-sm">
                          {item.qty}
                        </span>
                        <button
                          className="px-2.5 py-1"
                          onClick={() =>
                            updateQty(item.slug, item.size, item.qty + 1)
                          }
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm">
                        {formatPrice(item.price * item.qty)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-ink/10 px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="eyebrow">Subtotal</span>
                <span className="font-serif text-xl">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="btn-outline mb-2 w-full"
              >
                View bag
              </Link>
              <Link
                href="/checkout"
                onClick={closeDrawer}
                className="btn-primary w-full"
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
