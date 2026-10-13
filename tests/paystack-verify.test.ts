// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  evaluatePaystackTransaction,
  verifyWebhookSignature,
  type PaystackOrderRef,
  type PaystackTx,
} from "@/lib/paystack-verify";

const SECRET = "sk_test_signing_secret";
const BODY = '{"event":"charge.success","data":{"reference":"ord_1"}}';
const sign = (body: string, secret = SECRET) =>
  createHmac("sha512", secret).update(body).digest("hex");

describe("verifyWebhookSignature", () => {
  it("accepts the correct HMAC (any hex case, surrounding space)", () => {
    expect(verifyWebhookSignature(BODY, sign(BODY), SECRET)).toBe(true);
    expect(verifyWebhookSignature(BODY, sign(BODY).toUpperCase(), SECRET)).toBe(true);
    expect(verifyWebhookSignature(BODY, ` ${sign(BODY)} `, SECRET)).toBe(true);
  });

  it("rejects a changed body, a wrong secret and a tampered signature", () => {
    expect(verifyWebhookSignature(BODY + " ", sign(BODY), SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, sign(BODY, "other"), SECRET)).toBe(false);
    const sig = sign(BODY);
    const flipped = (sig[0] === "a" ? "b" : "a") + sig.slice(1);
    expect(verifyWebhookSignature(BODY, flipped, SECRET)).toBe(false);
  });

  it("returns false (never throws) for missing, empty or wrong-length headers", () => {
    expect(verifyWebhookSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, undefined, SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, "", SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, "abc", SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, sign(BODY) + "00", SECRET)).toBe(false);
  });

  it("returns false with no secret configured", () => {
    expect(verifyWebhookSignature(BODY, sign(BODY), "")).toBe(false);
    expect(verifyWebhookSignature(BODY, sign(BODY), undefined)).toBe(false);
  });
});

describe("evaluatePaystackTransaction", () => {
  const order: PaystackOrderRef = {
    id: "ord_1",
    total: 4_500_000,
    currency: "NGN",
    paymentProvider: "paystack",
  };
  const tx = (over: Partial<PaystackTx> = {}): PaystackTx => ({
    status: "success",
    reference: "ord_1",
    amount: 4_500_000,
    currency: "NGN",
    ...over,
  });

  it("is paid only when everything matches", () => {
    expect(evaluatePaystackTransaction(tx(), order)).toBe("paid");
  });

  it("is a mismatch on wrong amount, currency, reference or provider", () => {
    expect(evaluatePaystackTransaction(tx({ amount: 4_499_900 }), order)).toBe("mismatch");
    expect(evaluatePaystackTransaction(tx({ amount: 4_600_000 }), order)).toBe("mismatch");
    expect(evaluatePaystackTransaction(tx({ currency: "USD" }), order)).toBe("mismatch");
    expect(evaluatePaystackTransaction(tx({ reference: "ord_2" }), order)).toBe("mismatch");
    expect(evaluatePaystackTransaction(tx(), { ...order, paymentProvider: "stripe" })).toBe("mismatch");
    expect(evaluatePaystackTransaction(tx(), { ...order, paymentProvider: null })).toBe("mismatch");
  });

  it("maps settled failures to failed and in-flight states to pending", () => {
    for (const s of ["failed", "abandoned", "reversed"]) {
      expect(evaluatePaystackTransaction(tx({ status: s }), order)).toBe("failed");
    }
    for (const s of ["ongoing", "pending", "processing", "queued", ""]) {
      expect(evaluatePaystackTransaction(tx({ status: s }), order)).toBe("pending");
    }
  });

  it("checks the reference before the status", () => {
    expect(evaluatePaystackTransaction(tx({ status: "failed", reference: "x" }), order)).toBe("mismatch");
  });
});
