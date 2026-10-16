import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CURRENCY_LABELS, formatMoney } from "@/lib/currency";
import { countryName } from "@/lib/countries";
import {
  orderCurrency,
  orderShippingMinor,
  parseOrderItems,
  parseShippingAddress,
  paymentProviderLabel,
} from "@/lib/orders";
import FulfillmentForm from "@/components/admin/FulfillmentForm";

/** A dialable tel: link: digits only, keeping one leading "+". */
function telHref(phone: string): string {
  const plus = phone.trim().startsWith("+") ? "+" : "";
  return `tel:${plus}${phone.replace(/\D/g, "")}`;
}

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
  // Everything in the currency the order was charged in (D-26).
  const currency = orderCurrency(order);
  const money = (minor: number) => formatMoney(minor, currency);
  const shipping = orderShippingMinor(order);
  const address = parseShippingAddress(order.shippingAddress);
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

          <h2 className="mb-3 mt-8 font-serif text-lg text-ink">Payment</h2>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink-soft">Currency</dt>
            <dd className="text-ink">{CURRENCY_LABELS[currency]}</dd>
            <dt className="text-ink-soft">Paid via</dt>
            <dd className="text-ink">{paymentProviderLabel(order.paymentProvider)}</dd>
          </dl>
        </div>

        <div>
          {/* Address first: the owner reads it, ships, then records tracking. */}
          <h2 className="mb-3 font-serif text-lg text-ink">Delivery address</h2>
          {address ? (
            <div className="text-sm text-ink">
              <span className="block font-medium">{address.fullName}</span>
              <span className="block">{address.line1}</span>
              {address.line2 && <span className="block">{address.line2}</span>}
              <span className="block">
                {address.city}, {address.region}
                {address.postalCode ? ` ${address.postalCode}` : ""}
              </span>
              <span className="block">{countryName(address.country)}</span>
              {address.phone && (
                <a
                  href={telHref(address.phone)}
                  className="mt-2 inline-block text-sepia hover:text-ink"
                >
                  {address.phone}
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              No delivery address on record. This order was placed before addresses
              were collected.
            </p>
          )}

          <h2 className="mb-3 mt-8 font-serif text-lg text-ink">Fulfillment</h2>
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
