import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { parseCurrency } from "@/lib/currency";
import { markOrderPaid } from "@/lib/payments";

// Prisma with a pooled Postgres connection requires the Node.js runtime, not
// Edge — state it explicitly since webhook routes are sometimes mistakenly
// set to edge for faster cold starts.
export const runtime = "nodejs";

/**
 * Payment confirmation for dollar orders paid through Stripe (D-04, D-22).
 * Verifies the Stripe signature over the RAW request body, checks that the
 * session was actually paid, for exactly the order's total and currency, then
 * hands off to markOrderPaid: an atomic pending → paid switch that sends the
 * one shared confirmation email only when it made the change. The stored
 * Order row stays the sole authority for recipient, total and status
 * (T-11-05-04); the session is only checked against it.
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

    // A completed Checkout session isn't always a paid one (an async method
    // completes first and settles later); card-only today, but never assume.
    if (session.payment_status !== "paid") {
      console.error("stripe webhook: completed session is not paid", {
        orderId,
        eventId: event.id,
      });
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

    // The charge must be exactly what this order was created for: same
    // minor-unit amount, same currency (Stripe reports it lowercase).
    const currency = parseCurrency(order.currency);
    if (
      !currency ||
      session.amount_total !== order.total ||
      session.currency !== order.currency.toLowerCase()
    ) {
      console.error("stripe webhook: amount or currency does not match the order", {
        orderId,
        eventId: event.id,
      });
      return NextResponse.json({ received: true });
    }

    // Idempotent: only a still-pending order created for Stripe flips, so a
    // repeated delivery, or an order already paid, fulfilled or cancelled, is
    // a safe no-op that sends no second email (T-11-05-03).
    await markOrderPaid(order.id, {
      provider: "stripe",
      amount: order.total,
      currency,
    });
  }

  // Always ack 2xx once the signature is verified, per Stripe's guidance —
  // downstream errors must not turn into a non-2xx and a retry storm.
  // sendOrderConfirmation (via markOrderPaid) swallows its own failures (11-04).
  return NextResponse.json({ received: true });
}
