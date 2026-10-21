// Pure, Prisma-free shipping calculation (minor units). Single source of
// truth for the checkout UI display, the checkout API route that actually
// charges and persists the order total, and the storefront's free-delivery
// copy.
//
// This module exists because of a prior real bug: the UI and the API route
// each hardcoded their own copy of the $200 threshold / $15 fee, and the two
// copies drifted apart — the UI displayed a shipping-inclusive "Total" that
// Stripe never charged and the DB never recorded. See commit 540f395 for the
// mirror-image version of this bug (DB total included shipping, Stripe and
// the UI didn't). Importing from here instead of re-declaring the numbers is
// what makes that class of drift structurally impossible.
import type { Currency } from "@/lib/currency";

/** Nigeria is domestic; every other destination is international (D-16). */
export type ShippingZone = "domestic" | "international";

/**
 * Fee and free-delivery threshold per zone, in each currency's minor units
 * (kobo / cents). PLACEHOLDER rates (D-16) until the owner confirms real
 * ones; changing them is a code change here and nowhere else.
 */
export const SHIPPING_RATES: Record<
  ShippingZone,
  Record<Currency, { fee: number; freeOver: number }>
> = {
  domestic: {
    NGN: { fee: 500_000, freeOver: 25_000_000 }, // ₦5,000, free from ₦250,000
    USD: { fee: 500, freeOver: 20_000 }, // $5, free from $200
  },
  international: {
    NGN: { fee: 6_000_000, freeOver: 75_000_000 }, // ₦60,000, free from ₦750,000
    USD: { fee: 4_000, freeOver: 50_000 }, // $40, free from $500
  },
};

/** Free-delivery thresholds per zone, shaped for <Money amounts={…}>. */
export const FREE_SHIPPING_OVER: Record<ShippingZone, Record<Currency, number>> = {
  domestic: {
    NGN: SHIPPING_RATES.domestic.NGN.freeOver,
    USD: SHIPPING_RATES.domestic.USD.freeOver,
  },
  international: {
    NGN: SHIPPING_RATES.international.NGN.freeOver,
    USD: SHIPPING_RATES.international.USD.freeOver,
  },
};

export function zoneFor(country: string): ShippingZone {
  return country === "NG" ? "domestic" : "international";
}

/** The shipping fee for a subtotal, both in `currency`'s minor units. */
export function calculateShipping(
  subtotalMinor: number,
  currency: Currency,
  country: string,
): number {
  const { fee, freeOver } = SHIPPING_RATES[zoneFor(country)][currency];
  return subtotalMinor >= freeOver ? 0 : fee;
}
