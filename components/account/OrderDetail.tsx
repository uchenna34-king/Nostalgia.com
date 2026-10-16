import { addressLines } from "@/lib/address";
import { formatMoney } from "@/lib/currency";
import {
  orderCurrency,
  orderShippingMinor,
  parseOrderItems,
  parseShippingAddress,
} from "@/lib/orders";

/** Structural subset of a Prisma Order row this component needs. A full
 * Order row satisfies this shape, so the route can pass it directly. */
export type OrderDetailProps = {
  order: {
    id: string;
    status: string;
    /** Minor units of `currency`. */
    total: number;
    /** Absent or unrecognised means a legacy dollar order. */
    currency?: string | null;
    /** JSON snapshot; absent or null on legacy orders. */
    shippingAddress?: string | null;
    trackingNumber: string | null;
    createdAt: Date;
    items: string;
  };
};

// Four-state status presentation (UI-SPEC "Specific Contracts" section 2,
// verbatim). Deliberately duplicated (not imported) from OrderList.tsx —
// 11-03 owns that file and does not guarantee the helper is exported; a tiny
// duplicated four-entry map keeps the two plans decoupled. `paid` uses
// sepia-deep, NOT raw sepia — this pill can render on a cream-dark
// background and must clear 4.5:1 (locked AA rule).
const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-cream-dark text-ink-soft" },
  paid: { label: "Paid", className: "bg-sepia-deep/12 text-sepia-deep" },
  fulfilled: { label: "Fulfilled", className: "bg-ink text-cream" },
  cancelled: {
    label: "Cancelled",
    className: "bg-[#9B2C2C]/10 text-[#9B2C2C]",
  },
};

function statusMeta(status: string): { label: string; className: string } {
  const known = STATUS_META[status];
  if (known) return known;
  // Defensive fallback: Order.status is a String column, not a DB enum
  // (D-08a). An unrecognised value still renders with its own text label —
  // never a blank pill — rather than throwing or disappearing.
  return {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    className: "bg-cream-dark text-ink-soft",
  };
}

function StatusPill({ status }: { status: string }) {
  const { label, className } = statusMeta(status);
  return (
    <span
      className={`inline-block rounded-sm px-2 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export default function OrderDetail({ order }: OrderDetailProps) {
  const items = parseOrderItems(order.items);
  // Amounts in the currency the order was charged in (D-26), never the toggle.
  const currency = orderCurrency(order);
  const money = (minor: number) => formatMoney(minor, currency);
  const shipping = orderShippingMinor(order);
  const address = parseShippingAddress(order.shippingAddress);
  const reference = `#${order.id.slice(-8)}`;
  const date = order.createdAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Order</p>
      <h1 className="mt-2 font-serif text-3xl text-ink">{reference}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-soft">{date}</p>
        <StatusPill status={order.status} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-serif text-lg text-ink">Items</h2>
        <ul className="flex flex-col gap-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-4 text-sm">
              {item.image && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-14 object-cover"
                  />
                </>
              )}
              <span className="flex-1 text-ink">
                {item.name}
                <span className="text-ink-soft"> · {item.size}</span>
                <span className="text-ink-soft"> × {item.qty}</span>
              </span>
              <span className="tabular-nums text-ink">
                {money(item.unitPrice * item.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-cream-dark pt-4 text-sm text-ink-soft">
          <span>Shipping</span>
          <span className="tabular-nums">{shipping === 0 ? "Free" : money(shipping)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="font-medium text-ink">Total</span>
          <span className="tabular-nums font-medium text-ink">
            {money(order.total)}
          </span>
        </div>
      </div>

      {address && (
        <div className="mt-8">
          <h2 className="mb-1 font-serif text-lg text-ink">Delivery address</h2>
          <p className="text-sm text-ink-soft">
            {addressLines(address).map((line, i) => (
              <span key={i} className={i === 0 ? "block text-ink" : "block"}>
                {line}
              </span>
            ))}
          </p>
        </div>
      )}

      {order.trackingNumber && (
        <div className="mt-8">
          <h2 className="mb-1 font-serif text-lg text-ink">
            Tracking number
          </h2>
          <p className="text-sm text-ink-soft">{order.trackingNumber}</p>
        </div>
      )}
    </div>
  );
}
