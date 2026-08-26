import Link from "next/link";
import { parseOrderItems } from "@/lib/orders";
import { formatPrice } from "@/lib/products";

/** A single order row, already shaped for rendering — deliberately no email
 * column (unlike the admin table): a customer doesn't need their own email
 * repeated back at them. */
export type Row = {
  id: string;
  itemCount: number;
  total: number;
  status: string;
  createdAt: string;
};

type OrderInput = {
  id: string;
  items: string;
  total: number;
  status: string;
  createdAt: Date;
};

/**
 * Pure mapping from raw order rows to renderable Row[]. Prisma-import-free
 * (types + pure functions only) so it stays unit-testable without a DB —
 * mirrors lib/orders.ts's own header convention. Preserves input order; the
 * query's `orderBy: { createdAt: "desc" }` owns sort order, not this helper.
 */
export function toOrderRows(orders: OrderInput[]): Row[] {
  return orders.map((o) => ({
    id: o.id,
    itemCount: parseOrderItems(o.items).reduce((sum, i) => sum + i.qty, 0),
    total: o.total,
    status: o.status,
    createdAt: o.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  }));
}

// Four-state status presentation (UI-SPEC "Specific Contracts" section 2,
// verbatim). `paid` deliberately uses sepia-deep, NOT the admin OrderTable's
// raw text-sepia/bg-sepia — this pill can render inside a cream-dark mobile
// card, where raw sepia measures 4.01:1, below the 4.5:1 AA floor.
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

export default function OrderList({ orders }: { orders: Row[] }) {
  if (orders.length === 0) {
    return (
      <div className="mt-10 rounded-sm bg-cream-dark px-6 py-16 text-center">
        <h2 className="font-serif text-xl text-ink">No orders yet</h2>
        <p className="mt-2 text-sm text-ink-soft">
          When you place an order, it&apos;ll show up here.
        </p>
        <Link href="/shop" className="btn-primary mt-6">
          Browse the collection
        </Link>
      </div>
    );
  }

  const headingId = "account-orders-heading";

  return (
    <div className="mt-10">
      <h2 id={headingId} className="sr-only">
        Your orders
      </h2>

      {/* >=640px: semantic table, mirrors components/admin/OrderTable.tsx */}
      <div className="hidden sm:block">
        <table aria-labelledby={headingId} className="w-full text-left text-sm">
          <thead className="border-b border-cream-dark text-xs uppercase tracking-[0.15em] text-ink-soft">
            <tr>
              <th className="py-3 pr-4 font-medium">Order</th>
              <th className="py-3 pr-4 font-medium">Date</th>
              <th className="py-3 pr-4 font-medium">Items</th>
              <th className="py-3 pr-4 font-medium">Total</th>
              <th className="py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-cream-dark/60">
                <td className="py-3 pr-4">
                  <Link
                    href={`/account/orders/${o.id}`}
                    aria-label={`View order ${o.id.slice(-8)}`}
                    className="text-sepia-deep hover:text-ink"
                  >
                    #{o.id.slice(-8)}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-ink-soft">{o.createdAt}</td>
                <td className="py-3 pr-4 tabular-nums text-ink">
                  {o.itemCount}
                </td>
                <td className="py-3 pr-4 tabular-nums text-ink">
                  {formatPrice(o.total)}
                </td>
                <td className="py-3">
                  <StatusPill status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* <640px: card stack, no horizontal page scroll (UI-SPEC section 5) */}
      <div className="space-y-4 sm:hidden">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/account/orders/${o.id}`}
            aria-label={`View order ${o.id.slice(-8)}`}
            className="block min-h-[44px] rounded-sm bg-cream-dark p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sepia-deep">#{o.id.slice(-8)}</span>
              <span className="text-ink-soft">{o.createdAt}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <StatusPill status={o.status} />
              <span className="tabular-nums text-ink">
                {formatPrice(o.total)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
