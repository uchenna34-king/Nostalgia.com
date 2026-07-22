import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { parseOrderItems } from "@/lib/orders";
import FulfillmentForm from "@/components/admin/FulfillmentForm";

// Rendering is owner-gated by app/admin/layout.tsx (requireOwner) — a non-owner
// guessing an order id never reaches this page's data (IDOR mitigation).
export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) notFound();

  const items = parseOrderItems(order.items);
  const date = order.createdAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="max-w-3xl">
      <p className="text-xs uppercase tracking-[0.25em] text-sepia">Order</p>
      <h1 className="mt-2 font-serif text-3xl text-ink">
        #{order.id.slice(-8)}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {order.email} · {date}
      </p>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-serif text-lg text-ink">Items</h2>
          <ul className="flex flex-col gap-3">
            {items.map((item, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-ink">
                  {item.name}
                  <span className="text-ink-soft"> · {item.size}</span>
                  <span className="text-ink-soft"> × {item.qty}</span>
                </span>
                <span className="tabular-nums text-ink">
                  {formatPrice(item.unitPrice * item.qty)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-cream-dark pt-4 text-sm">
            <span className="font-medium text-ink">Total</span>
            <span className="tabular-nums font-medium text-ink">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-lg text-ink">Fulfillment</h2>
          <FulfillmentForm
            orderId={order.id}
            status={order.status}
            trackingNumber={order.trackingNumber}
            notes={order.notes}
          />
        </div>
      </div>
    </div>
  );
}
