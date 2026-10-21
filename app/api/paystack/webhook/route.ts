import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCurrency } from "@/lib/currency";
import { markOrderPaid } from "@/lib/payments";
import {
  evaluatePaystackTransaction,
  isPaystackReference,
  toPaystackTx,
  verifyWebhookSignature,
  type PaystackTx,
} from "@/lib/paystack-verify";

// node:crypto (the signature) and Prisma both need Node, not Edge.
export const runtime = "nodejs";

/**
 * The signed charge.success event in `raw`, or null for anything else: other
 * events, malformed JSON, or a reference that can't be one of our order ids
 * (refused before it reaches the database).
 */
function successfulCharge(raw: string): PaystackTx | null {
  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!event || typeof event !== "object") return null;
  const { event: name, data } = event as { event?: unknown; data?: unknown };
  if (name !== "charge.success" || !data || typeof data !== "object") return null;
  const tx = toPaystackTx(data);
  return isPaystackReference(tx.reference) ? tx : null;
}

/**
 * Payment confirmation for orders paid through Paystack (D-20, D-22): naira
 * always, dollars when USD_PAYMENT_PROVIDER routes them here. It covers the
 * shopper who closes the tab before the callback (app/api/paystack/callback)
 * runs, and settles the same order the same way.
 *
 * The signature (HMAC-SHA512 of the RAW body, keyed with the secret key) is
 * checked before anything is parsed or read. Only charge.success counts, and
 * only when its reference, amount and currency match a pending order routed
 * to Paystack; markOrderPaid's compare-and-set then makes the switch and
 * sends the one confirmation email, so a repeated delivery, or the webhook
 * landing after the callback, changes nothing.
 *
 * Every verified delivery gets a 200, whatever its verdict, so Paystack
 * doesn't keep retrying an event that will never apply. The exception is a
 * database failure: that 500s on purpose, because the retry is what records
 * the payment once the database is back.
 *
 * Logs carry the reference only: never the body (the customer's email and
 * card details), never the key.
 */
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    // No Paystack key configured (demo mode): nothing to verify.
    return NextResponse.json({ received: true });
  }

  // Raw text first: JSON.parse then re-serialising changes the signed bytes.
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"), secret)) {
    console.error("paystack webhook: signature verification failed");
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const tx = successfulCharge(raw);
  if (!tx) return NextResponse.json({ received: true });

  try {
    const order = await prisma.order.findUnique({ where: { id: tx.reference } });
    const currency = order ? parseCurrency(order.currency) : null;
    const verdict = order ? evaluatePaystackTransaction(tx, order) : "unknown_order";
    if (!order || !currency || verdict !== "paid") {
      console.error("paystack webhook: charge not applied", {
        reference: tx.reference,
        verdict,
      });
      return NextResponse.json({ received: true });
    }
    if (order.status === "cancelled") {
      // Money moved for an order that can no longer be paid: the owner has to
      // refund or reinstate it by hand.
      console.error("paystack webhook: successful charge for a cancelled order", {
        reference: tx.reference,
      });
    }
    await markOrderPaid(order.id, { provider: "paystack", amount: order.total, currency });
  } catch (e) {
    const err = e as Error;
    console.error("paystack webhook: could not record the payment", {
      reference: tx.reference,
      name: err?.name,
      message: err?.message,
    });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
