// Pure email-content builder for order confirmation mail (LIVE-03, D-05, D-06).
// Prisma-import-free (types + pure functions only) so it stays unit-testable
// without a DB or network — mirrors lib/orders.ts and lib/catalog.ts.
import { addressLines } from "@/lib/address";
import { formatMoney } from "@/lib/currency";
import {
  orderCurrency,
  orderShippingMinor,
  parseOrderItems,
  parseShippingAddress,
} from "@/lib/orders";

/** Structural subset of the Prisma `Order` row this module consumes. Declared
 * structurally (not imported from `@prisma/client`) so this module never
 * drags Prisma into a unit test. */
export type OrderEmailSource = {
  id: string;
  email: string;
  items: string;
  /** Minor units of `currency`. */
  total: number;
  /** "NGN" | "USD"; orders from before multi-currency are "USD". */
  currency: string;
  /** JSON snapshot of the delivery address; null on legacy orders. */
  shippingAddress: string | null;
  status: string;
  createdAt: Date;
};

export type OrderEmailLine = {
  name: string;
  size: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  formattedUnitPrice: string;
  formattedLineTotal: string;
  image?: string;
};

export type OrderEmailContent = {
  reference: string;
  subject: string;
  preheader: string;
  lines: OrderEmailLine[];
  total: number;
  formattedTotal: string;
  /** Derived fee (total minus lines), or "Free". */
  formattedShipping: string;
  /** Delivery address, one entry per printed line; null when there's none. */
  addressLines: string[] | null;
  statusLabel: string;
  statusColor: string;
  orderUrl: string | null;
  placedOn: string;
};

/** Returns the `#` prefix plus the id's final eight characters — the same
 * truncation convention already used on `/order/success` and the admin/
 * account order detail pages (UI-SPEC Contract 3). Reuse this everywhere;
 * never inline the slice at call sites. */
export function orderReference(id: string): string {
  return `#${id.slice(-8)}`;
}

// Four-state status presentation (UI-SPEC "Specific Contracts" section 2 /
// section 6), rendered here as plain colored text (no pill background — see
// UI-SPEC Contract 6, email clients render inline background-color
// inconsistently). Palette is black and white only, so the states are told
// apart by weight of grey; `cancelled` keeps a functional red.
const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#595959" },
  paid: { label: "Paid", color: "#000000" },
  fulfilled: { label: "Fulfilled", color: "#000000" },
  cancelled: { label: "Cancelled", color: "#9B2C2C" },
};

function statusMeta(status: string): { label: string; color: string } {
  const known = STATUS_META[status];
  if (known) return known;
  // Defensive fallback: Order.status is a String column, not a DB enum
  // (D-08a). An unrecognised value still renders with its own text label
  // rather than throwing or rendering blank.
  return {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    color: "#595959",
  };
}

/**
 * Builds the full email payload from an order row. Pure: no Prisma import,
 * no network call, no environment read — every value it needs arrives as an
 * argument. `baseUrl` is passed straight through from the caller
 * (`process.env.NEXTAUTH_URL` in `lib/email.ts`) with no fallback origin
 * substituted here (D-09) — when absent, `orderUrl` is `null` and the
 * template omits the "View your order" link entirely.
 */
export function buildOrderConfirmationContent(
  order: OrderEmailSource,
  baseUrl?: string | null,
): OrderEmailContent {
  const reference = orderReference(order.id);
  const items = parseOrderItems(order.items);
  const { label: statusLabel, color: statusColor } = statusMeta(order.status);
  // Every amount in the order's own currency (D-26): the one it was charged in.
  const currency = orderCurrency(order);
  const money = (minor: number) => formatMoney(minor, currency);

  const lines: OrderEmailLine[] = items.map((item) => {
    const lineTotal = item.unitPrice * item.qty;
    return {
      name: item.name,
      size: item.size,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal,
      formattedUnitPrice: money(item.unitPrice),
      formattedLineTotal: money(lineTotal),
      image: item.image,
    };
  });

  // The order's stored total is the authority — never a re-sum of the parsed
  // line items, since that's what the customer actually paid. Shipping is
  // what the total holds beyond the lines (UI-SPEC A-7).
  const formattedTotal = money(order.total);
  const shipping = orderShippingMinor(order);
  const address = parseShippingAddress(order.shippingAddress);

  const placedOn = order.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return {
    reference,
    subject: `Your Nostalgia order ${reference} is confirmed`,
    preheader: `Your Nostalgia order ${reference} is confirmed`,
    lines,
    total: order.total,
    formattedTotal,
    formattedShipping: shipping === 0 ? "Free" : money(shipping),
    addressLines: address ? addressLines(address) : null,
    statusLabel,
    statusColor,
    orderUrl: baseUrl ? `${baseUrl}/account/orders/${order.id}` : null,
    placedOn,
  };
}
