// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_KEY = process.env.PAYSTACK_SECRET_KEY;
const fetchMock = vi.fn();

async function load(key: string | undefined) {
  if (key === undefined) delete process.env.PAYSTACK_SECRET_KEY;
  else process.env.PAYSTACK_SECRET_KEY = key;
  vi.resetModules();
  return import("@/lib/paystack");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const INPUT = {
  email: "buyer@example.com",
  amountMinor: 4_500_000,
  currency: "NGN" as const,
  reference: "ord_1",
  callbackUrl: "https://shop.test/api/paystack/callback",
  cancelUrl: "https://shop.test/checkout?payment=cancelled",
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIGINAL_KEY === undefined) delete process.env.PAYSTACK_SECRET_KEY;
  else process.env.PAYSTACK_SECRET_KEY = ORIGINAL_KEY;
});

describe("lib/paystack without a key", () => {
  it("reports disabled and refuses to call the API", async () => {
    const p = await load(undefined);
    expect(p.paystackEnabled).toBe(false);
    await expect(p.initializeTransaction(INPUT)).rejects.toBeInstanceOf(p.PaystackError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("initializeTransaction", () => {
  it("posts the documented body with the bearer key and returns the URL", async () => {
    const p = await load("sk_test_abc");
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: true,
        data: { authorization_url: "https://checkout.paystack.com/xyz", reference: "ord_1" },
      }),
    );

    const out = await p.initializeTransaction(INPUT);
    expect(out).toEqual({ authorizationUrl: "https://checkout.paystack.com/xyz", reference: "ord_1" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.paystack.co/transaction/initialize");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer sk_test_abc");
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body)).toEqual({
      email: "buyer@example.com",
      amount: "4500000",
      currency: "NGN",
      reference: "ord_1",
      callback_url: INPUT.callbackUrl,
      metadata: { orderId: "ord_1", cancel_action: INPUT.cancelUrl },
    });
  });

  it("throws on non-2xx, status:false, bad JSON, a non-https URL and network errors", async () => {
    const p = await load("sk_test_abc");
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: false, message: "x" }, 400));
    await expect(p.initializeTransaction(INPUT)).rejects.toBeInstanceOf(p.PaystackError);

    fetchMock.mockResolvedValueOnce(jsonResponse({ status: false }));
    await expect(p.initializeTransaction(INPUT)).rejects.toBeInstanceOf(p.PaystackError);

    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 200 }));
    await expect(p.initializeTransaction(INPUT)).rejects.toBeInstanceOf(p.PaystackError);

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: true, data: { authorization_url: "javascript:alert(1)" } }),
    );
    await expect(p.initializeTransaction(INPUT)).rejects.toBeInstanceOf(p.PaystackError);

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(p.initializeTransaction(INPUT)).rejects.toBeInstanceOf(p.PaystackError);
  });
});

describe("verifyTransaction", () => {
  it("encodes the reference into the path and returns the normalized tx", async () => {
    const p = await load("sk_test_abc");
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: true,
        data: { status: "success", reference: "a/b?c", amount: 4_500_000, currency: "NGN", extra: 1 },
      }),
    );
    const tx = await p.verifyTransaction("a/b?c");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.paystack.co/transaction/verify/a%2Fb%3Fc",
    );
    expect(tx).toEqual({ status: "success", reference: "a/b?c", amount: 4_500_000, currency: "NGN" });
  });

  it("throws rather than report success when Paystack errors", async () => {
    const p = await load("sk_test_abc");
    fetchMock.mockResolvedValue(jsonResponse({ status: false }, 404));
    await expect(p.verifyTransaction("ord_1")).rejects.toBeInstanceOf(p.PaystackError);
  });
});
