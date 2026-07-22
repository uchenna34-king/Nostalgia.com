import Link from "next/link";
import { formatPrice } from "@/lib/products";

type Row = {
  id: string;
  email: string;
  itemCount: number;
  total: number;
  status: string;
  createdAt: string;
};

// Tone-on-tone status pills: sepia for the positive/active `fulfilled`,
// destructive red for `cancelled`, neutral cream-dark otherwise. Labels lowercase.
function pillClass(status: string): string {
  if (status === "fulfilled") return "bg-sepia/15 text-sepia";
  if (status === "cancelled") return "bg-[#9B2C2C]/10 text-[#9B2C2C]";
  return "bg-cream-dark text-ink";
}

export default function OrderTable({ orders }: { orders: Row[] }) {
  if (orders.length === 0) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-ink">Orders</h1>
        <div className="mt-8 rounded-sm bg-cream-dark px-6 py-16 text-center">
          <h2 className="font-serif text-xl text-ink">No orders yet</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Orders will appear here once customers check out — nothing to fulfill
            right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">Orders</h1>
      <table className="mt-8 w-full text-left text-sm">
        <thead className="border-b border-cream-dark text-xs uppercase tracking-[0.15em] text-ink-soft">
          <tr>
            <th className="py-3 pr-4 font-medium">Order</th>
            <th className="py-3 pr-4 font-medium">Date</th>
            <th className="py-3 pr-4 font-medium">Customer</th>
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
                  href={`/admin/orders/${o.id}`}
                  aria-label={`View order ${o.id.slice(-8)}`}
                  className="text-sepia hover:text-ink"
                >
                  #{o.id.slice(-8)}
                </Link>
              </td>
              <td className="py-3 pr-4 text-ink-soft">{o.createdAt}</td>
              <td className="py-3 pr-4 text-ink">{o.email}</td>
              <td className="py-3 pr-4 tabular-nums text-ink">{o.itemCount}</td>
              <td className="py-3 pr-4 tabular-nums text-ink">
                {formatPrice(o.total)}
              </td>
              <td className="py-3">
                <span
                  className={`inline-block rounded-sm px-2 py-1 text-xs ${pillClass(
                    o.status,
                  )}`}
                >
                  {o.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
