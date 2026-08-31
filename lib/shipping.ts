// Pure, Prisma-free shipping calculation (cents). Single source of truth for
// both the cart/checkout UI display and the checkout API route that actually
// charges and persists the order total.
//
// This module exists because of a prior real bug: the UI and the API route
// each hardcoded their own copy of the $200 threshold / $15 fee, and the two
// copies drifted apart — the UI displayed a shipping-inclusive "Total" that
// Stripe never charged and the DB never recorded. See commit 540f395 for the
// mirror-image version of this bug (DB total included shipping, Stripe and
// the UI didn't). Importing from here instead of re-declaring the numbers is
// what makes that class of drift structurally impossible.

export const FREE_SHIPPING_THRESHOLD = 20000; // $200, in cents
export const SHIPPING_FEE = 1500; // $15, in cents

/** Returns the shipping fee (cents) for a given subtotal (cents). */
export function calculateShipping(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
