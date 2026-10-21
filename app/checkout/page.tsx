import CheckoutClient from "@/components/checkout/CheckoutClient";
import { resolveProvider } from "@/lib/payment-provider";

type PaymentNoticeKind = "failed" | "cancelled" | "pending";

// Only these come back from a provider round trip; anything else shows no
// notice. Checked here rather than with the notice's own helper, which lives
// in a client module and can't be called on the server.
function noticeKind(value: string | string[] | undefined): PaymentNoticeKind | null {
  return value === "failed" || value === "cancelled" || value === "pending" ? value : null;
}

/**
 * /checkout. A server component so two things are decided here, not in the
 * browser: which provider takes each currency (USD_PAYMENT_PROVIDER can route
 * dollars through Paystack, UI-SPEC A-14), and the ?payment= notice, read
 * from the request instead of useSearchParams. Reading searchParams also
 * makes the page render per request.
 */
export default function CheckoutPage({
  searchParams,
}: {
  searchParams: { payment?: string | string[] };
}) {
  const providers = {
    NGN: resolveProvider("NGN", process.env),
    USD: resolveProvider("USD", process.env),
  };
  return <CheckoutClient providers={providers} payment={noticeKind(searchParams.payment)} />;
}
