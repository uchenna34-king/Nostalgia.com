// Pure Paystack checks shared by the webhook and the callback (D-20, D-21), so
// the two paths that can mark an order paid apply ONE rule and can never drift
// apart — the same lesson as lib/shipping.ts.
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * x-paystack-signature is the hex HMAC-SHA512 of the RAW body, keyed with the
 * secret key. timingSafeEqual throws on unequal lengths, so lengths are
 * compared first (a short or garbage header returns false, never throws).
 */
export function verifyWebhookSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (!header || !secret) return false;
  const expected = Buffer.from(
    createHmac("sha512", secret).update(rawBody).digest("hex"),
    "utf8",
  );
  const given = Buffer.from(header.trim().toLowerCase(), "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** The transaction fields we rely on (from verify or a charge.success event). */
export type PaystackTx = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
};

export type TxVerdict = "paid" | "failed" | "pending" | "mismatch";

/** The stored Order fields the verdict is checked against — the only authority. */
export type PaystackOrderRef = {
  id: string;
  total: number;
  currency: string;
  paymentProvider: string | null;
};

const FAILED_STATUSES = new Set(["failed", "abandoned", "reversed"]);

/**
 * "paid" only when the transaction succeeded AND its reference, amount and
 * currency match the stored order AND the order was routed to Paystack.
 * Anything not yet settled (ongoing, pending, processing, queued) is
 * "pending" so the shopper isn't told it failed while money may still move.
 * The amount must equal the order total exactly, which requires the Paystack
 * account to keep "merchant bears fees" (see 12-OWNER-SETUP.md).
 */
export function evaluatePaystackTransaction(
  tx: PaystackTx,
  order: PaystackOrderRef,
): TxVerdict {
  if (tx.reference !== order.id || order.paymentProvider !== "paystack") {
    return "mismatch";
  }
  if (tx.status !== "success") {
    return FAILED_STATUSES.has(tx.status) ? "failed" : "pending";
  }
  return tx.amount === order.total && tx.currency === order.currency
    ? "paid"
    : "mismatch";
}
