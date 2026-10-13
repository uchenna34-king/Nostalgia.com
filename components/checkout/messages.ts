// Checkout error copy (UI-SPEC Copywriting). Every message says what happened,
// whether money moved, and what to do next.

const MESSAGES: Record<string, string> = {
  not_authenticated: "Your session expired. Please sign in again.",
  payments_unavailable:
    "Payments are temporarily unavailable. You haven't been charged. Please try again shortly.",
  payment_provider_error:
    "We couldn't reach the payment provider. You haven't been charged. Please try again.",
  price_changed:
    "Some prices have changed since you added these items. Review your bag and try again.",
  invalid_address:
    "We couldn't use that address. Check the highlighted fields and try again.",
};

const GENERIC =
  "Something went wrong starting checkout. You haven't been charged. Please try again.";

export function checkoutErrorMessage(code: string | null | undefined): string {
  return (code && MESSAGES[code]) || GENERIC;
}
