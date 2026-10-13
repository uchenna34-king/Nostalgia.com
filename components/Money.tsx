import { formatMoney, type Currency } from "@/lib/currency";

/**
 * A catalog price in both currencies (D-10). Renders a ₦ span and a $ span
 * with identical markup on server and client; the unlayered rule in
 * app/globals.css shows only the shopper's currency, set on <html> before
 * first paint. No wrapper and no styling of its own: the call site keeps its
 * classes (size, colour, tabular-nums). Not a client component, so it renders
 * on the server for static pages.
 *
 * Order amounts must NOT use this: an order is shown in the currency it was
 * charged in, via formatMoney(total, order currency).
 */
export default function Money({
  amounts,
  className,
}: {
  amounts: Record<Currency, number>;
  className?: string;
}) {
  return (
    <>
      <span data-money="NGN" className={className}>
        {formatMoney(amounts.NGN, "NGN")}
      </span>
      <span data-money="USD" className={className}>
        {formatMoney(amounts.USD, "USD")}
      </span>
    </>
  );
}

/** The active currency's symbol (₦ / $), switched by the same CSS rule. */
export function CurrencySymbol({ className }: { className?: string }) {
  return (
    <>
      <span data-money="NGN" className={className}>
        ₦
      </span>
      <span data-money="USD" className={className}>
        $
      </span>
    </>
  );
}
