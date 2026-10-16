import { CURRENCIES, MAX_MINOR, type Currency } from "@/lib/currency";

/**
 * Bag items, pure (no React, no storage) so they can be unit-tested.
 *
 * Every item snapshots its price in BOTH currencies (D-13), so switching
 * currency never touches the bag. The snapshot is for display only: checkout
 * re-prices every line from the database (app/api/checkout/route.ts).
 */
export type CartItem = {
  slug: string;
  name: string;
  /** Minor units (kobo / cents) for one piece. */
  prices: Record<Currency, number>;
  image: string;
  size: string;
  qty: number;
};

export type PriceUpdate = { slug: string } & Record<Currency, number>;

function isPrice(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_MINOR
  );
}

function isPrices(value: unknown): value is Record<Currency, number> {
  if (!value || typeof value !== "object") return false;
  const prices = value as Record<string, unknown>;
  return CURRENCIES.every((c) => isPrice(prices[c]));
}

const isText = (v: unknown): v is string => typeof v === "string" && v.length > 0;

export function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    isText(item.slug) &&
    isText(item.name) &&
    isText(item.size) &&
    isPrices(item.prices) &&
    typeof item.qty === "number" &&
    Number.isInteger(item.qty) &&
    item.qty > 0 &&
    (item.image === undefined || typeof item.image === "string")
  );
}

/**
 * Load-time cleanup of whatever localStorage holds. Entries from before
 * multi-currency (a single `price`) and anything malformed are dropped
 * (D-13); kept entries are rebuilt field by field so nothing else leaks in.
 */
export function normaliseCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidCartItem).map((i) => ({
    slug: i.slug,
    name: i.name,
    prices: { NGN: i.prices.NGN, USD: i.prices.USD },
    image: i.image ?? "",
    size: i.size,
    qty: i.qty,
  }));
}

/** One bag line (piece price x quantity) in each currency. */
export function lineTotal(item: CartItem): Record<Currency, number> {
  return { NGN: item.prices.NGN * item.qty, USD: item.prices.USD * item.qty };
}

/** Bag subtotal in each currency, never mixed. */
export function subtotalsOf(items: CartItem[]): Record<Currency, number> {
  const totals = { NGN: 0, USD: 0 } as Record<Currency, number>;
  for (const item of items) {
    const line = lineTotal(item);
    for (const c of CURRENCIES) totals[c] += line[c];
  }
  return totals;
}

/**
 * Refresh snapshots with the server's current prices (the checkout 409
 * `price_changed` reply). Applies to every size of a product; invalid
 * numbers are ignored.
 */
export function applyPriceUpdates(items: CartItem[], updates: PriceUpdate[]): CartItem[] {
  const bySlug = new Map<string, Record<Currency, number>>();
  for (const u of updates) {
    const prices = { NGN: u.NGN, USD: u.USD };
    if (isPrices(prices)) bySlug.set(u.slug, prices);
  }
  return items.map((i) => {
    const prices = bySlug.get(i.slug);
    return prices ? { ...i, prices } : i;
  });
}
