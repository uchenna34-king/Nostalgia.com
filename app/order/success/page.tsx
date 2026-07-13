"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";

function SuccessInner() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const isDemo = params.get("demo") === "1";
  const { clear } = useCart();
  const cleared = useRef(false);

  // Empty the bag once the order is confirmed.
  useEffect(() => {
    if (!cleared.current) {
      clear();
      cleared.current = true;
    }
  }, [clear]);

  return (
    <main className="container-x flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-sepia text-2xl text-sepia">
        ✓
      </div>
      <p className="eyebrow mt-6">Order confirmed</p>
      <h1 className="mt-3 font-serif text-5xl font-black">Thank you.</h1>
      <p className="mt-4 max-w-md text-ink-soft">
        Your Nostalgia order is in. We&apos;ll send a confirmation shortly and let
        you know when it ships.
      </p>
      {orderId && (
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-ink-soft">
          Order reference: {orderId.slice(-8)}
        </p>
      )}
      {isDemo && (
        <p className="mt-2 text-xs text-ink-soft">
          (Demo checkout — no payment was charged.)
        </p>
      )}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn-primary">
          Continue shopping
        </Link>
        <Link href="/account" className="btn-outline">
          View account
        </Link>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="container-x py-24 text-center text-ink-soft">
          Loading…
        </main>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
