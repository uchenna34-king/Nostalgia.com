import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { initializeTransaction, paystackEnabled } from "@/lib/paystack";
import { calculateShipping } from "@/lib/shipping";
import { sendOrderConfirmation } from "@/lib/email";
import { MAX_MINOR, parseCurrency, type Currency } from "@/lib/currency";
import { validateAddress } from "@/lib/address";
import { demoCheckoutAllowed, resolveProvider } from "@/lib/payment-provider";

type IncomingItem = { slug: string; size: string; qty: number };

// Runtime guard — `body.items` is untrusted client input, not just a type
// assertion. Rejects non-array `items` and any item with a missing/wrong-typed
// or non-numeric `qty` with a 400 instead of throwing (non-array) or flowing
// a NaN qty/total into the order (bad qty) further down.
function isIncomingItem(x: unknown): x is IncomingItem {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as Record<string, unknown>).slug === "string" &&
    typeof (x as Record<string, unknown>).size === "string" &&
    typeof (x as Record<string, unknown>).qty === "number" &&
    Number.isFinite((x as Record<string, unknown>).qty)
  );
}

/**
 * Starts a payment (D-17). The order of checks matters: nothing is written
 * until the request is fully valid and the site can build its redirects.
 *
 *  1. signed in → 2. JSON → 3. items → 4. currency (allow-list) → 5. address
 *     (server-side validation, the authority) → 6. NEXTAUTH_URL
 *  7. every price re-read from the database in that currency — never trust
 *     client totals — and shipping from lib/shipping.ts, the one formula the
 *     checkout page shows
 *  8. if the bag's own total is stale, 409 with current prices, no order
 *  9. provider chosen on the server (naira → Paystack, dollars → Stripe
 *     unless USD_PAYMENT_PROVIDER says Paystack). No key: the demo on
 *     development only, otherwise 503 — never a free "paid" order (D-24)
 * 10. a pending order, then the provider's hosted checkout; if the provider
 *     fails, that order is cancelled and the customer told nothing was charged
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const rawItems = input.items;
  if (!Array.isArray(rawItems) || !rawItems.every(isIncomingItem)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const incoming: IncomingItem[] = rawItems;

  if (incoming.length === 0) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }

  const currency = parseCurrency(input.currency);
  if (!currency) {
    return NextResponse.json({ error: "invalid_currency" }, { status: 400 });
  }

  const checked = validateAddress(input.address);
  if (!checked.ok) {
    return NextResponse.json(
      { error: "invalid_address", fields: checked.errors },
      { status: 400 },
    );
  }
  const address = checked.address;

  // Never derive redirect targets from the client-controlled `Origin` header —
  // it is attacker-forgeable on any direct (non-browser) request, and both
  // providers accept any HTTPS return URL, so trusting it would let a forged
  // Origin send a paying customer to an attacker's domain. Always use the
  // server-configured site URL.
  //
  // No hardcoded fallback origin (D-09): NEXTAUTH_URL is already required by
  // NextAuth and is set in every deployed environment and local .env.local,
  // so if it is ever unset here that is a genuine misconfiguration — fail
  // loudly with a 500 before any order is created, rather than silently
  // redirecting a paying customer to a dead origin.
  const origin = process.env.NEXTAUTH_URL;
  if (!origin) {
    console.error(
      "checkout: NEXTAUTH_URL is not set — refusing to build a redirect URL",
    );
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 },
    );
  }

  // Recompute prices/names from the database, in the order's currency.
  const slugs = [...new Set(incoming.map((i) => i.slug))];
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    include: { images: { orderBy: { position: "asc" } } },
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const lineItems = incoming
    .map((i) => {
      const p = bySlug.get(i.slug);
      if (!p) return null;
      // `sizes` is a JSON-encoded string column (see lib/products.ts
      // `deserialize`) — parse it to validate the client-supplied size
      // against the product's real size list rather than trusting it
      // verbatim (it is persisted to Order.items and sent to the provider).
      let validSizes: string[] = [];
      try {
        validSizes = JSON.parse(p.sizes) as string[];
      } catch {
        validSizes = [];
      }
      if (!validSizes.includes(i.size)) return null;
      const qty = Math.max(1, Math.min(20, Math.floor(i.qty)));
      return {
        slug: p.slug,
        name: p.name,
        size: i.size,
        unitPrice: currency === "NGN" ? p.priceNgn : p.priceUsd,
        qty,
        image: p.images[0]?.url,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (lineItems.length === 0) {
    return NextResponse.json({ error: "no_valid_items" }, { status: 400 });
  }

  const subtotal = lineItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  // Single source of truth for the fee (lib/shipping.ts), so the amount the
  // provider charges, the amount stored as Order.total and the amount the
  // checkout page shows can never drift apart again.
  const shipping = calculateShipping(subtotal, currency, address.country);
  const total = subtotal + shipping;
  // Order.total is an INTEGER column; a bag this large can't be stored.
  if (total > MAX_MINOR) {
    return NextResponse.json({ error: "order_too_large" }, { status: 400 });
  }

  // The bag shows prices snapshotted when items were added. If the server's
  // total differs, say so with current prices instead of charging a number
  // the customer never saw (T-12-17).
  if (typeof input.expectedTotal === "number" && input.expectedTotal !== total) {
    return NextResponse.json(
      {
        error: "price_changed",
        prices: products.map((p) => ({ slug: p.slug, NGN: p.priceNgn, USD: p.priceUsd })),
      },
      { status: 409 },
    );
  }

  // `user.id` is expected to always be populated for an authenticated
  // session (see the `session` callback in lib/auth.ts). Surface it loudly
  // if that invariant ever breaks instead of silently writing an orphaned
  // Order with userId: null.
  const rawUserId = (session.user as { id?: string }).id;
  if (!rawUserId) {
    console.error(
      "checkout: authenticated session is missing user.id — order will be created with userId: null",
      { email: session.user.email },
    );
  }
  const userId = rawUserId ?? null;

  const orderData = {
    userId,
    email: session.user.email,
    items: JSON.stringify(lineItems),
    total,
    currency,
    // The validated, normalised address only — never the raw input.
    shippingAddress: JSON.stringify(address),
  };

  const provider = resolveProvider(currency, process.env);
  const configured = provider === "paystack" ? paystackEnabled : stripe !== null;

  // --- No key for that provider. ---
  if (!configured) {
    if (!demoCheckoutAllowed(process.env)) {
      console.error("checkout: no payment key for provider", { provider });
      return NextResponse.json({ error: "payments_unavailable" }, { status: 503 });
    }
    // Demo: the order is marked paid with no money taken. It sends the same
    // shared confirmation email a real payment does, so testers exercise the
    // identical send path (D-06).
    const order = await prisma.order.create({
      data: { ...orderData, status: "paid", paymentProvider: "demo" },
    });
    await sendOrderConfirmation(order.id);
    return NextResponse.json({
      url: `${origin}/order/success?order=${order.id}&demo=1&currency=${currency}`,
    });
  }

  // --- A real payment: a pending order, paid later by a verified webhook. ---
  const order = await prisma.order.create({
    data: { ...orderData, status: "pending", paymentProvider: provider },
  });

  try {
    const url =
      provider === "paystack"
        ? await startPaystack(order.id, session.user.email, total, currency, origin)
        : await startStripe(order.id, session.user.email, lineItems, shipping, currency, origin);
    return NextResponse.json({ url });
  } catch (e) {
    // Nothing was charged; don't leave a pending order nobody can pay.
    const err = e as Error;
    console.error("checkout: payment provider failed", {
      provider,
      orderId: order.id,
      name: err?.name,
      message: err?.message,
    });
    await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
    return NextResponse.json({ error: "payment_provider_error" }, { status: 502 });
  }
}

async function startPaystack(
  orderId: string,
  email: string,
  total: number,
  currency: Currency,
  origin: string,
): Promise<string> {
  const { authorizationUrl } = await initializeTransaction({
    email,
    amountMinor: total,
    currency,
    reference: orderId,
    callbackUrl: `${origin}/api/paystack/callback`,
    cancelUrl: `${origin}/checkout?payment=cancelled`,
  });
  return authorizationUrl;
}

async function startStripe(
  orderId: string,
  email: string,
  lineItems: { name: string; size: string; unitPrice: number; qty: number }[],
  shipping: number,
  currency: Currency,
  origin: string,
): Promise<string> {
  // No address collection, tax or promotion codes: any of them would make
  // Stripe charge something other than Order.total (D-23, T-12-18).
  const stripeCurrency = currency.toLowerCase();
  const checkout = await stripe!.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [
      ...lineItems.map((i) => ({
        quantity: i.qty,
        price_data: {
          currency: stripeCurrency,
          unit_amount: i.unitPrice,
          product_data: { name: `${i.name} — ${i.size}` },
        },
      })),
      // Only added when a fee actually applies — an explicit zero line item
      // is noise on the Stripe page for orders with free shipping.
      ...(shipping > 0
        ? [
            {
              quantity: 1,
              price_data: {
                currency: stripeCurrency,
                unit_amount: shipping,
                product_data: { name: "Shipping Delivery Fees" },
              },
            },
          ]
        : []),
    ],
    success_url: `${origin}/order/success?order=${orderId}&session_id={CHECKOUT_SESSION_ID}&currency=${currency}`,
    cancel_url: `${origin}/cart`,
    metadata: { orderId },
  });
  if (!checkout.url) throw new Error("stripe_no_url");
  return checkout.url;
}
