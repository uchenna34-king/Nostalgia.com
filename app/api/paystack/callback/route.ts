import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCurrency, type Currency } from "@/lib/currency";
import { markOrderPaid } from "@/lib/payments";
import { verifyTransaction } from "@/lib/paystack";
import {
  evaluatePaystackTransaction,
  isPaystackReference,
} from "@/lib/paystack-verify";
import type { PaymentNoticeKind } from "@/components/checkout/PaymentNotice";

export const runtime = "nodejs";
// Next 14 can prerender a GET route handler and replay the response; this one
// must run for every shopper (Pitfall 6).
export const dynamic = "force-dynamic";

// The order is already settled: by the webhook, or by an earlier visit here.
const SETTLED = new Set(["paid", "fulfilled"]);

function redirect(location: string) {
  const res = NextResponse.redirect(location, 303);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

/**
 * Where Paystack sends the shopper after the payment page (the
 * transaction's callback_url, D-21). The query string only says WHICH order;
 * whether it was paid comes from Paystack itself, asked server-to-server with
 * the secret key, and checked by the same rule as the webhook
 * (lib/paystack-verify.ts). So the shopper sees their confirmation at once,
 * and the webhook still covers anyone who closes the tab.
 *
 * Each outcome lands on a page that tells the truth (UI-SPEC A-5):
 *  - paid (or already paid)          → /order/success
 *  - abandoned on Paystack's page    → ?payment=cancelled
 *  - failed or reversed              → ?payment=failed
 *  - still in flight                 → ?payment=pending
 *  - money may have moved but the order can't take it (wrong amount or
 *    currency, a cancelled order), or Paystack or the database didn't
 *    answer                          → ?payment=pending, never "you haven't
 *    been charged", and logged for the owner
 *  - not one of our Paystack orders  → ?payment=failed, without calling Paystack
 *
 * Nothing here cancels an order: an abandoned payment can be retried, and a
 * late webhook can still pay it (Pitfall 17). Every redirect is NEXTAUTH_URL
 * plus a fixed path and values from the stored order; nothing from the
 * request is ever a destination.
 */
export async function GET(req: Request) {
  const origin = process.env.NEXTAUTH_URL;
  if (!origin) {
    console.error("paystack callback: NEXTAUTH_URL is not set — refusing to build a redirect URL");
    return new Response("server_misconfigured", {
      status: 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  const success = (orderId: string, currency: Currency) =>
    redirect(`${origin}/order/success?order=${orderId}&currency=${currency}`);
  const notice = (kind: PaymentNoticeKind) => redirect(`${origin}/checkout?payment=${kind}`);

  // Paystack appends ?trxref=…&reference=… (the same value) to callback_url.
  const params = new URL(req.url).searchParams;
  const reference = params.get("reference") || params.get("trxref");
  if (!isPaystackReference(reference)) return notice("failed");

  try {
    const order = await prisma.order.findUnique({ where: { id: reference } });
    const currency = order ? parseCurrency(order.currency) : null;
    if (!order || order.paymentProvider !== "paystack" || !currency) return notice("failed");
    if (SETTLED.has(order.status)) return success(order.id, currency);

    const tx = await verifyTransaction(reference);
    const verdict = evaluatePaystackTransaction(tx, order);
    if (verdict === "failed") return notice(tx.status === "abandoned" ? "cancelled" : "failed");
    if (verdict === "pending") return notice("pending");
    if (verdict === "mismatch") {
      console.error("paystack callback: transaction does not match the order", {
        reference,
        status: tx.status,
      });
      return notice("pending");
    }

    const { transitioned } = await markOrderPaid(order.id, {
      provider: "paystack",
      amount: order.total,
      currency,
    });
    if (transitioned) return success(order.id, currency);

    // The switch matched nothing: the webhook may have just paid it, or the
    // order was cancelled while the shopper was on Paystack's page.
    const now = await prisma.order.findUnique({
      where: { id: order.id },
      select: { status: true },
    });
    if (now && SETTLED.has(now.status)) return success(order.id, currency);
    console.error("paystack callback: successful charge for an order that can't be paid", {
      reference,
      status: now?.status,
    });
    return notice("pending");
  } catch (e) {
    const err = e as Error;
    console.error("paystack callback: could not confirm the payment", {
      reference,
      name: err?.name,
      message: err?.message,
    });
    return notice("pending");
  }
}
