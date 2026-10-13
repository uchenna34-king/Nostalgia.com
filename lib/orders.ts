// Order fulfillment domain helpers. Prisma-import-free (types + pure functions
// only) so it stays unit-testable without a DB — mirrors lib/catalog.ts.
import { parseCurrency, type Currency } from "@/lib/currency";
import type { ShippingAddress } from "@/lib/address";

/** The fixed fulfillment pipeline (D-12). Order is the intended progression. */
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "fulfilled",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const STATUS_SET = new Set<string>(ORDER_STATUSES);

/**
 * Allow-list-before-use guard (same idiom as buildOrderBy/SORT_OPTIONS). Any
 * value not in ORDER_STATUSES is rejected before it can be written to
 * Order.status — never trust a client-supplied status string.
 */
export function isValidOrderStatus(value: string): value is OrderStatus {
  return STATUS_SET.has(value);
}

/** A single line item as snapshotted into Order.items at checkout. */
export type OrderItem = {
  slug: string;
  name: string;
  size: string;
  unitPrice: number;
  qty: number;
  image?: string;
};

/**
 * Defensively parse the Order.items JSON snapshot. Returns [] on parse failure
 * or a non-array payload rather than throwing, so a corrupt row never breaks
 * the admin order list/detail.
 */
export function parseOrderItems(itemsJson: string): OrderItem[] {
  try {
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x) => ({
        slug: String(x.slug ?? ""),
        name: String(x.name ?? ""),
        size: String(x.size ?? ""),
        unitPrice: Number(x.unitPrice ?? 0),
        qty: Number(x.qty ?? 0),
        image: x.image ? String(x.image) : undefined,
      }));
  } catch {
    return [];
  }
}

// ---- Payment provider, currency and delivery address (D-25, D-26) ----

/** Who took the payment. App-level allow-list, like ORDER_STATUSES. */
export const PAYMENT_PROVIDERS = ["paystack", "stripe", "demo"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

const PROVIDER_SET = new Set<string>(PAYMENT_PROVIDERS);

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return typeof value === "string" && PROVIDER_SET.has(value);
}

export function paymentProviderLabel(value: string | null | undefined): string {
  switch (value) {
    case "paystack":
      return "Paystack";
    case "stripe":
      return "Stripe";
    case "demo":
      return "Demo (no real payment)";
    default:
      return "—";
  }
}

/**
 * The currency an order was charged in. Orders from before Phase 12 were all
 * charged in dollars, and Order.currency defaults to "USD" for them; anything
 * unrecognised falls back to USD too rather than mislabelling an amount.
 */
export function orderCurrency(order: { currency?: string | null }): Currency {
  return parseCurrency(order.currency) ?? "USD";
}

/**
 * Defensively parse the Order.shippingAddress JSON snapshot. Returns null for
 * legacy orders (no address) and for anything corrupt or incomplete, so a bad
 * row never breaks the admin/account order pages.
 */
export function parseShippingAddress(json: string | null | undefined): ShippingAddress | null {
  if (!json) return null;
  try {
    const x = JSON.parse(json) as Record<string, unknown>;
    if (!x || typeof x !== "object") return null;
    const str = (k: string) => (typeof x[k] === "string" ? (x[k] as string) : "");
    const address: ShippingAddress = {
      fullName: str("fullName"),
      phone: str("phone"),
      line1: str("line1"),
      city: str("city"),
      region: str("region"),
      country: str("country"),
    };
    if (!address.fullName || !address.line1 || !address.country) return null;
    if (str("line2")) address.line2 = str("line2");
    if (str("postalCode")) address.postalCode = str("postalCode");
    return address;
  } catch {
    return null;
  }
}

/**
 * The shipping fee an order paid: the stored total minus its line items
 * (UI-SPEC A-7). Correct for legacy orders too, whose total already included
 * shipping. Clamped at 0 so a corrupt snapshot can't show a negative fee.
 */
export function orderShippingMinor(order: { total: number; items: string }): number {
  const lines = parseOrderItems(order.items).reduce(
    (sum, i) => sum + i.unitPrice * i.qty,
    0,
  );
  return Math.max(0, order.total - lines);
}
