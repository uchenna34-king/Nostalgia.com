"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/products";
import { trackEvent } from "@/lib/analytics";

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const { items, subtotal } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const beganRef = useRef(false);

  // Require authentication — redirect to sign-in, returning here afterward.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin?callbackUrl=/checkout");
    }
  }, [status, router]);

  // begin_checkout (D-09): fire once when an authenticated user reaches checkout
  // with a non-empty cart. Declared above the early returns (Rules of Hooks).
  // Payload is non-PII — item count + cart subtotal in cents, never the email.
  useEffect(() => {
    if (status === "authenticated" && items.length > 0 && !beganRef.current) {
      beganRef.current = true;
      trackEvent("begin_checkout", { itemCount: items.length, amount: subtotal });
    }
  }, [status, items.length, subtotal]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="container-x py-24 text-center text-ink-soft">
        Preparing checkout…
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container-x flex min-h-[50vh] flex-col items-center justify-center gap-5 py-20 text-center">
        <h1 className="font-serif text-4xl font-black">Nothing to check out</h1>
        <Link href="/shop" className="btn-primary">
          Browse the collection
        </Link>
      </main>
    );
  }

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.slug,
            size: i.size,
            qty: i.qty,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "checkout_failed");
      window.location.href = data.url;
    } catch (e) {
      setError(
        e instanceof Error && e.message === "not_authenticated"
          ? "Your session expired. Please sign in again."
          : "Something went wrong starting checkout. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <main className="container-x py-14">
      <h1 className="mb-10 font-serif text-5xl font-black">Checkout</h1>

      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="eyebrow mb-4">
            Signed in as {session?.user?.email}
          </p>
          {items.map((item) => (
            <div
              key={`${item.slug}-${item.size}`}
              className="flex items-center gap-4 border-b border-ink/10 py-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name}
                className="h-20 w-16 object-cover"
              />
              <div className="flex-1">
                <p className="font-serif text-lg">{item.name}</p>
                <p className="text-sm text-ink-soft">
                  Size {item.size} · Qty {item.qty}
                </p>
              </div>
              <span>{formatPrice(item.price * item.qty)}</span>
            </div>
          ))}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-ink/15 p-6">
            <h2 className="font-serif text-2xl">Order summary</h2>
            <div className="mt-5 flex justify-between text-sm text-ink-soft">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-ink-soft">
              <span>Shipping</span>
              <span>{subtotal >= 20000 ? "Free" : formatPrice(1500)}</span>
            </div>
            <div className="mt-5 flex justify-between border-t border-ink/10 pt-5 text-lg">
              <span className="font-serif">Total</span>
              <span className="font-serif">
                {formatPrice(subtotal + (subtotal >= 20000 ? 0 : 1500))}
              </span>
            </div>

            {error && <p className="mt-4 text-sm text-sepia">{error}</p>}

            <button
              onClick={handlePay}
              disabled={loading}
              className="btn-primary mt-6 w-full disabled:opacity-60"
            >
              {loading ? "Redirecting…" : "Pay now"}
            </button>
            <p className="mt-3 text-center text-xs text-ink-soft">
              Secure checkout · Stripe test mode
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
