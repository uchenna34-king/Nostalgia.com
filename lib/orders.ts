// Order fulfillment domain helpers. Prisma-import-free (types + pure functions
// only) so it stays unit-testable without a DB — mirrors lib/catalog.ts.

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
