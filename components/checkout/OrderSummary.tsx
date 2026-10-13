import { CURRENCY_LABELS, formatMoney, type Currency } from "@/lib/currency";
import { countryName } from "@/lib/countries";
import type { CheckoutProvider } from "@/lib/payment-provider";

const PROVIDER_NAME: Record<CheckoutProvider, string> = {
  paystack: "Paystack",
  stripe: "Stripe",
};

/**
 * Checkout summary card (UI-SPEC Surface 3). Amounts arrive as props in the
 * checkout currency; the Pay button submits the address form by id, so Enter
 * in any field and this button share one validation path. The provider name
 * is evaluated on the server and passed in: dollars can be routed to
 * Paystack, so the browser never guesses it from the currency.
 */
export default function OrderSummary({
  currency,
  subtotal,
  shipping,
  total,
  country,
  provider,
  loading,
  error,
}: {
  currency: Currency;
  subtotal: number;
  shipping: number;
  total: number;
  country: string;
  provider: CheckoutProvider;
  loading: boolean;
  error: string | null;
}) {
  const providerName = PROVIDER_NAME[provider];
  const zone = country === "NG" ? "Within Nigeria" : `International · ${countryName(country)}`;

  return (
    <div className="border border-ink/15 p-6">
      <h2 className="font-serif text-2xl">Order summary</h2>
      <p className="mt-1 text-xs text-ink-soft">Paying in {CURRENCY_LABELS[currency]}</p>

      <div className="mt-5 flex justify-between text-sm text-ink-soft">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
      </div>
      <div className="mt-2 flex justify-between gap-4 text-sm text-ink-soft">
        <span>
          Shipping
          <span className="block text-xs">{zone}</span>
        </span>
        <span className="tabular-nums" aria-live="polite">
          {shipping === 0 ? "Free" : formatMoney(shipping, currency)}
        </span>
      </div>
      <div className="mt-5 flex justify-between border-t border-ink/10 pt-5 text-lg">
        <span className="font-serif">Total</span>
        <span className="font-sans tabular-nums" aria-live="polite">
          {formatMoney(total, currency)}
        </span>
      </div>

      {error && (
        <p id="checkout-error" role="alert" className="mt-4 text-sm text-[#9B2C2C] dark:text-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        form="checkout-form"
        disabled={loading}
        aria-busy={loading}
        className="btn-primary mt-6 w-full disabled:opacity-60"
      >
        {loading ? `Redirecting to ${providerName}…` : "Pay now"}
      </button>
      <p className="mt-3 text-center text-xs text-ink-soft">Secure checkout · {providerName}</p>
    </div>
  );
}
