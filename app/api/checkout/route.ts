import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { calculateShipping } from "@/lib/shipping";
import { sendOrderConfirmation } from "@/lib/email";

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

  const rawItems =
    body && typeof body === "object"
      ? (body as { items?: unknown }).items
      : undefined;
  if (!Array.isArray(rawItems) || !rawItems.every(isIncomingItem)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const incoming: IncomingItem[] = rawItems;

  if (incoming.length === 0) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }

  // Recompute prices/names from the database — never trust client totals.
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
      // verbatim (it is persisted to Order.items and sent to Stripe).
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
        unitPrice: p.price,
        qty,
        image: p.images[0]?.url,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (lineItems.length === 0) {
    return NextResponse.json({ error: "no_valid_items" }, { status: 400 });
  }

  const subtotal = lineItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  // Single source of truth for the fee (lib/shipping.ts) so the amount Stripe
  // charges, the amount persisted to Order.total, and the amount the cart/
  // checkout UI displays can never drift apart from one another again.
  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;
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

  // Never derive Stripe redirect targets from the client-controlled `Origin`
  // header — it is attacker-forgeable on any direct (non-browser) request and
  // Stripe accepts any HTTPS success_url/cancel_url, so trusting it would let
  // a forged Origin redirect a paying user to an attacker-controlled domain
  // after checkout. Always use the server-configured site URL.
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

  // --- Stub mode: no Stripe key. Mark paid immediately. ---
  if (!stripe) {
    const order = await prisma.order.create({
      data: {
        userId,
        email: session.user.email,
        items: JSON.stringify(lineItems),
        total,
        status: "paid",
      },
    });
    // D-06: the demo/stub branch sends the same shared confirmation email a
    // real payment does, so UAT testers exercise the identical send path.
    // Not called in the Stripe branch below — that order is pending and its
    // email fires from the webhook once payment is confirmed.
    await sendOrderConfirmation(order.id);
    return NextResponse.json({
      url: `${origin}/order/success?order=${order.id}&demo=1`,
    });
  }

  // --- Stripe test mode. ---
  const order = await prisma.order.create({
    data: {
      userId,
      email: session.user.email,
      items: JSON.stringify(lineItems),
      total,
      status: "pending",
    },
  });

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email,
    line_items: [
      ...lineItems.map((i) => ({
        quantity: i.qty,
        price_data: {
          currency: "usd",
          unit_amount: i.unitPrice,
          product_data: { name: `${i.name} — ${i.size}` },
        },
      })),
      // Only added when a fee actually applies — an explicit $0 line item is
      // unnecessary noise on the Stripe checkout page for orders that qualify
      // for free shipping.
      ...(shipping > 0
        ? [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: shipping,
                product_data: { name: "Shipping Delivery Fees" },
              },
            },
          ]
        : []),
    ],
    success_url: `${origin}/order/success?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
    metadata: { orderId: order.id },
  });

  return NextResponse.json({ url: checkout.url });
}
