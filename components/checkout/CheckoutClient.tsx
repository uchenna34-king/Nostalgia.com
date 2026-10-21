"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { trackEvent } from "@/lib/analytics";
import { calculateShipping } from "@/lib/shipping";
import { formatMoney, type Currency } from "@/lib/currency";
import { DEFAULT_REGION } from "@/lib/region";
import type { AddressErrors, ShippingAddress } from "@/lib/address";
import type { CheckoutProvider } from "@/lib/payment-provider";
import AddressForm from "@/components/checkout/AddressForm";
import OrderSummary from "@/components/checkout/OrderSummary";
import PaymentNotice, { type PaymentNoticeKind } from "@/components/checkout/PaymentNotice";
import { checkoutErrorMessage } from "@/components/checkout/messages";

/**
 * The checkout page's client side (D-14, D-15, UI-SPEC Surface 3): the bag in
 * the shopper's currency, the delivery address, and the summary with Pay.
 * Shipping comes from lib/shipping.ts for the chosen country, the same
 * function the server charges with. The server re-prices everything; the
 * total shown here is sent along so a stale bag gets a 409, not a surprise.
 */
export default function CheckoutClient({
  providers,
  payment,
}: {
  /** Evaluated on the server: dollars may be routed through Paystack. */
  providers: Record<Currency, CheckoutProvider>;
  payment: PaymentNoticeKind | null;
}) {
  const { data: session, status } = useSession();
  const { items, subtotals, updatePrices } = useCart();
  const { currency, region } = useCurrency();
  const router = useRouter();
  // The destination starts at the ship-to region (D-33) and is pinned there:
  // once the address form is showing it, the form is the authority, and a
  // region change in the nav doesn't move it.
  const [country, setCountry] = useState<string | null>(null);
  useEffect(() => {
    if (region) setCountry((c) => c ?? region);
  }, [region]);
  const destination = country ?? region ?? DEFAULT_REGION;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<AddressErrors | null>(null);
  const beganRef = useRef(false);

  // Require authentication — redirect to sign-in, returning here afterward.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin?callbackUrl=/checkout");
    }
  }, [status, router]);

  // Coming back from the provider with Back restores this page from the
  // back/forward cache with the button still busy; free it.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const subtotal = currency ? subtotals[currency] : 0;

  // begin_checkout (D-09, D-27): once, when an authenticated shopper reaches
  // checkout with a non-empty bag. Non-PII: count, amount and currency only,
  // never the email or any address data.
  useEffect(() => {
    if (status === "authenticated" && currency && items.length > 0 && !beganRef.current) {
      beganRef.current = true;
      trackEvent("begin_checkout", { itemCount: items.length, amount: subtotal, currency });
    }
  }, [status, currency, items.length, subtotal]);

  // The currency is read after mount (CurrencyContext), like the session.
  if (status === "loading" || status === "unauthenticated" || !currency) {
    return (
      <main className="container-x py-24 text-center text-ink-soft">
        Preparing checkout…
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container-x flex min-h-[50vh] flex-col items-center justify-center gap-5 py-20 text-center">
        <h1 className="font-serif text-4xl font-normal">Nothing to check out</h1>
        <Link href="/shop" className="btn-primary">
          Browse the collection
        </Link>
      </main>
    );
  }

  const shipping = calculateShipping(subtotal, currency, destination);
  const total = subtotal + shipping;

  async function pay(address: ShippingAddress) {
    if (!currency) return;
    setLoading(true);
    setError(null);
    setServerErrors(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ slug: i.slug, size: i.size, qty: i.qty })),
          currency,
          address,
          expectedTotal: total,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: unknown;
        error?: string;
        fields?: AddressErrors;
        prices?: { slug: string; NGN: number; USD: number }[];
      };
      if (res.ok && typeof data.url === "string") {
        // Stay in the redirecting state while the browser leaves.
        window.location.href = data.url;
        return;
      }
      if (data.error === "price_changed" && Array.isArray(data.prices)) {
        updatePrices(data.prices);
      }
      if (data.error === "invalid_address" && data.fields) {
        setServerErrors(data.fields);
      }
      setError(checkoutErrorMessage(data.error));
    } catch {
      setError(checkoutErrorMessage(null));
    }
    setLoading(false);
  }

  return (
    <main className="container-x py-14">
      <h1 className="mb-10 font-serif text-5xl font-normal">Checkout</h1>
      <PaymentNotice kind={payment} />

      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="eyebrow mb-4">Signed in as {session?.user?.email}</p>
          {items.map((item) => (
            <div
              key={`${item.slug}-${item.size}`}
              className="flex items-center gap-4 border-b border-ink/10 py-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.name} className="h-20 w-16 object-cover" />
              <div className="flex-1">
                <p className="font-serif text-lg">{item.name}</p>
                <p className="text-sm text-ink-soft">
                  Size {item.size} · Qty {item.qty}
                </p>
              </div>
              <span className="tabular-nums">
                {formatMoney(item.prices[currency] * item.qty, currency)}
              </span>
            </div>
          ))}

          <section aria-labelledby="delivery-heading" className="mt-12">
            <h2 id="delivery-heading" className="font-serif text-2xl font-normal">
              Delivery address
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Where should we send your order? All fields are required unless marked
              optional.
            </p>
            <AddressForm
              initialCountry={destination}
              onValidSubmit={pay}
              onCountryChange={setCountry}
              serverErrors={serverErrors}
              disabled={loading}
            />
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary
            currency={currency}
            subtotal={subtotal}
            shipping={shipping}
            total={total}
            country={destination}
            provider={providers[currency]}
            loading={loading}
            error={error}
          />
        </aside>
      </div>
    </main>
  );
}
