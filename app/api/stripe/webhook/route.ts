import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/email";

// Prisma with a pooled Postgres connection requires the Node.js runtime, not
// Edge — state it explicitly since webhook routes are sometimes mistakenly
// set to edge for faster cold starts.
export const runtime = "nodejs";

/**
 * The single source of truth for payment status (D-04). Verifies the Stripe
 * signature over the RAW request body, then idempotently transitions the
 * matching Order from `pending` to `paid` and fires the one shared
 * confirmation email (D-06). Never trusts anything in the event payload
 * beyond `metadata.orderId` — the stored Order row is the sole authority for
 * recipient, total, and current status (T-11-05-04).
 */
export async function POST(req: Request) {
  if (!stripe) {
    // No Stripe key configured (stub/demo mode) — nothing to verify.
    return NextResponse.json({ received: true });
  }

  // Read the RAW body first. This is the one route in the codebase that must
  // NOT call req.json() — JSON-parsing reformats the exact bytes Stripe
  // signed, which makes constructEvent fail signature verification
  // irrecoverably (Pitfall 1, T-11-05-02).
  const body = await req.text();
  const signature = headers().get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    // No body, no secret — short message only (T-11-05-01).
    console.error("stripe webhook: signature verification failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // Only checkout.session.completed triggers the transition — subscribing to
  // more than the one event double-fires the email (Pitfall 2, D-04).
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      console.error(
        "stripe webhook: checkout.session.completed with no orderId metadata",
        { eventId: event.id },
      );
      return NextResponse.json({ received: true });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      console.error(
        "stripe webhook: order not found for metadata.orderId",
        { orderId, eventId: event.id },
      );
      return NextResponse.json({ received: true });
    }

    // Idempotency guard: the transition runs only when the order is still
    // pending, so a repeated Stripe delivery — or an order that already
    // advanced to fulfilled/cancelled — is a safe no-op (T-11-05-03). No
    // separate event-ledger table is needed for this single one-way
    // transition.
    if (order.status === "pending") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "paid" },
      });
      await sendOrderConfirmation(order.id);
    }
  }

  // Always ack 2xx once the signature is verified, per Stripe's guidance —
  // downstream errors must not turn into a non-2xx and a retry storm.
  // sendOrderConfirmation already swallows its own failures (11-04).
  return NextResponse.json({ received: true });
}
