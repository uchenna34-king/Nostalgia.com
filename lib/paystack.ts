// Paystack REST client over fetch (D-19) — two endpoints, no SDK dependency.
// Same null-if-no-key idiom as lib/stripe.ts: an unset key is an ordinary,
// expected state (the checkout route then uses the stub or returns 503).
//
// Never log the key, a request body or a response body: they carry the
// secret and the customer's email.
import type { Currency } from "@/lib/currency";
import { toPaystackTx, type PaystackTx } from "@/lib/paystack-verify";

const key = process.env.PAYSTACK_SECRET_KEY;
export const paystackEnabled = Boolean(key);

const BASE = "https://api.paystack.co";
const TIMEOUT_MS = 10_000;

/** Any non-2xx, `status: false`, unparseable body or network failure. */
export class PaystackError extends Error {}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!key) throw new PaystackError("paystack_not_configured");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new PaystackError("paystack_network");
  }
  const json = (await res.json().catch(() => null)) as
    | { status?: boolean; data?: unknown }
    | null;
  if (!res.ok || !json || json.status !== true) {
    throw new PaystackError(`paystack_${res.status}`);
  }
  return json as T;
}

export type InitializeInput = {
  email: string;
  amountMinor: number;
  currency: Currency;
  /** Our Order id — the one key that ties the payment back to the order. */
  reference: string;
  callbackUrl: string;
  cancelUrl: string;
};

/** Starts a hosted-checkout payment; returns the URL to send the shopper to. */
export async function initializeTransaction(
  input: InitializeInput,
): Promise<{ authorizationUrl: string; reference: string }> {
  const r = await call<{
    data: { authorization_url: string; reference: string };
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      // Documented as a string in the currency's subunit.
      amount: String(input.amountMinor),
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      // cancel_action sends "Cancel payment" back to checkout. Correctness
      // never depends on metadata: reference === order id is the key.
      metadata: { orderId: input.reference, cancel_action: input.cancelUrl },
    }),
  });
  const url = r.data?.authorization_url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new PaystackError("paystack_bad_response");
  }
  return { authorizationUrl: url, reference: r.data.reference };
}

/** The transaction as Paystack records it, fetched with our secret key. */
export async function verifyTransaction(reference: string): Promise<PaystackTx> {
  const r = await call<{ data?: unknown }>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  return toPaystackTx(r.data);
}
