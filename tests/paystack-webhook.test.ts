// @vitest-environment node
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The Paystack webhook is one of the three places a real payment marks an
// order paid (D-20, D-22). As in tests/stripe-webhook.test.ts, every case
// asserts the HTTP response AND both side effects that matter — the status
// write and the confirmation email — never one without the other.
// lib/paystack-verify.ts (the real HMAC check) and lib/payments.ts (the real
// compare-and-set) both run; the database is a one-order fake whose
// updateMany applies the same where-clause matching Postgres would.
const findUnique = vi.fn();
const updateMany = vi.fn();
const sendOrderConfirmation = vi.fn();

type FakeOrder = {
  id: string;
  status: string;
  total: number;
  currency: string;
  paymentProvider: string | null;
};
let order: FakeOrder | null;

vi.mock("@/lib/db", () => ({
  prisma: {
    order: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      updateMany: (...a: unknown[]) => updateMany(...a),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendOrderConfirmation: (...a: unknown[]) => sendOrderConfirmation(...a),
}));

const SECRET = "sk_test_webhook_secret";
const ORDER_ID = "cmorder0000000000000000001";
const sign = (body: string, secret = SECRET) =>
  createHmac("sha512", secret).update(body).digest("hex");

function chargeEvent(data: Record<string, unknown> = {}, event = "charge.success") {
  return JSON.stringify({
    event,
    data: {
      id: 302961,
      status: "success",
      reference: ORDER_ID,
      amount: 4_500_000,
      currency: "NGN",
      customer: { email: "ada@example.com" },
      ...data,
    },
  });
}

function request(body: string, signature: string | null = sign(body)) {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) headers.set("x-paystack-signature", signature);
  return new Request("http://localhost/api/paystack/webhook", {
    method: "POST",
    body,
    headers,
  });
}

async function post(body: string, signature?: string | null) {
  const { POST } = await import("@/app/api/paystack/webhook/route");
  return POST(request(body, signature === undefined ? sign(body) : signature));
}

let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv("PAYSTACK_SECRET_KEY", SECRET);
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

  order = {
    id: ORDER_ID,
    status: "pending",
    total: 4_500_000,
    currency: "NGN",
    paymentProvider: "paystack",
  };
  findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    order && order.id === where.id ? { ...order } : null,
  );
  updateMany.mockImplementation(
    async ({ where, data }: { where: Partial<FakeOrder>; data: { status: string } }) => {
      const matches =
        order !== null &&
        (Object.keys(where) as (keyof FakeOrder)[]).every((k) => order![k] === where[k]);
      if (matches) order!.status = data.status;
      return { count: matches ? 1 : 0 };
    },
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  errorLog.mockRestore();
});

/** No read, no write, no email: the request changed nothing. */
function expectUntouched() {
  expect(updateMany).not.toHaveBeenCalled();
  expect(sendOrderConfirmation).not.toHaveBeenCalled();
  expect(order!.status).toBe("pending");
}

describe("POST /api/paystack/webhook — configuration", () => {
  // First in the file, so it pays for the cold import of the route and
  // next/server: room for a loaded full run, as in tests/admin.test.ts.
  it("runs on Node (node:crypto and Prisma), never Edge", async () => {
    const route = await import("@/app/api/paystack/webhook/route");
    expect(route.runtime).toBe("nodejs");
  }, 30_000);

  it("acknowledges and does nothing when no Paystack key is configured", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    const res = await post(chargeEvent(), "anything");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(findUnique).not.toHaveBeenCalled();
    expectUntouched();
  });
});

describe("POST /api/paystack/webhook — signature (checked before anything else)", () => {
  it("401s a missing signature without reading the database", async () => {
    const res = await post(chargeEvent(), null);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_signature" });
    expect(findUnique).not.toHaveBeenCalled();
    expectUntouched();
  });

  it("401s a signature made with another key", async () => {
    const body = chargeEvent();
    const res = await post(body, sign(body, "sk_test_someone_else"));
    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
    expectUntouched();
  });

  it("401s a body changed after signing (a raised amount, say)", async () => {
    const signed = chargeEvent();
    const tampered = chargeEvent({ amount: 100 });
    const res = await post(tampered, sign(signed));
    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
    expectUntouched();
  });

  it("401s a garbage or truncated signature without throwing", async () => {
    const body = chargeEvent();
    for (const sig of ["", "abc", sign(body).slice(0, 64), sign(body) + "00"]) {
      const res = await post(body, sig);
      expect(res.status, JSON.stringify(sig)).toBe(401);
    }
    expect(findUnique).not.toHaveBeenCalled();
    expectUntouched();
  });

  it("verifies the exact bytes sent, not a re-serialised copy", async () => {
    // Odd spacing and key order: JSON.parse → JSON.stringify would change
    // these bytes and the signature with them.
    const body =
      `{ "data" : { "currency":"NGN", "amount": 4500000, "reference":"${ORDER_ID}",` +
      ` "status":"success" },\n  "event":"charge.success" }`;
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(order!.status).toBe("paid");
  });
});

describe("POST /api/paystack/webhook — charge.success", () => {
  it("marks the matching order paid and sends exactly one confirmation", async () => {
    const res = await post(chargeEvent());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: ORDER_ID } });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: ORDER_ID,
        status: "pending",
        total: 4_500_000,
        currency: "NGN",
        paymentProvider: "paystack",
      },
      data: { status: "paid" },
    });
    expect(order!.status).toBe("paid");
    expect(sendOrderConfirmation).toHaveBeenCalledTimes(1);
    expect(sendOrderConfirmation).toHaveBeenCalledWith(ORDER_ID);
  });

  it("pays a dollar order routed to Paystack (USD_PAYMENT_PROVIDER=paystack)", async () => {
    order = { ...order!, total: 28_500, currency: "USD" };
    const res = await post(chargeEvent({ amount: 28_500, currency: "USD" }));
    expect(res.status).toBe(200);
    expect(order!.status).toBe("paid");
    expect(sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it("is safe to deliver twice: one write, one email", async () => {
    const body = chargeEvent();
    expect((await post(body)).status).toBe(200);
    expect((await post(body)).status).toBe(200);
    expect(order!.status).toBe("paid");
    expect(sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it("sends no second email when the callback already marked it paid", async () => {
    order!.status = "paid";
    const res = await post(chargeEvent());
    expect(res.status).toBe(200);
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it.each([
    ["a different amount", { amount: 4_499_900 }],
    ["the amount in naira rather than kobo", { amount: 45_000 }],
    ["a fractional amount", { amount: 4_500_000.5 }],
    ["no amount", { amount: null }],
    ["a different currency", { currency: "USD" }],
    ["a lowercase currency", { currency: "ngn" }],
    ["a status other than success", { status: "failed" }],
  ])("ignores a charge with %s (200, nothing written)", async (_label, data) => {
    const res = await post(chargeEvent(data));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expectUntouched();
  });

  it("never pays an order that was routed to Stripe", async () => {
    order!.paymentProvider = "stripe";
    const res = await post(chargeEvent());
    expect(res.status).toBe(200);
    expectUntouched();
  });

  it("never pays a demo order", async () => {
    order!.paymentProvider = "demo";
    const res = await post(chargeEvent());
    expect(res.status).toBe(200);
    expectUntouched();
  });

  it("never revives a cancelled order", async () => {
    order!.status = "cancelled";
    const res = await post(chargeEvent());
    expect(res.status).toBe(200);
    expect(order!.status).toBe("cancelled");
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("acknowledges a reference that matches no order", async () => {
    const res = await post(chargeEvent({ reference: "cmsomeoneelse000000000001" }));
    expect(res.status).toBe(200);
    expectUntouched();
  });

  it.each([
    ["missing", undefined],
    ["a number", 12345678901],
    ["an object", { id: ORDER_ID }],
    ["path characters", "../../admin/orders"],
    ["too short", "abc"],
    ["too long", "x".repeat(65)],
  ])("never looks up a reference that is %s", async (_label, reference) => {
    const res = await post(chargeEvent({ reference }));
    expect(res.status).toBe(200);
    expect(findUnique).not.toHaveBeenCalled();
    expectUntouched();
  });
});

describe("POST /api/paystack/webhook — other payloads", () => {
  it.each(["charge.failed", "transfer.success", "refund.processed", "subscription.create"])(
    "acknowledges %s without reading the database",
    async (event) => {
      const res = await post(chargeEvent({}, event));
      expect(res.status).toBe(200);
      expect(findUnique).not.toHaveBeenCalled();
      expectUntouched();
    },
  );

  it.each([
    ["not JSON", "not json at all"],
    ["JSON null", "null"],
    ["an array", "[1,2,3]"],
    ["no data", '{"event":"charge.success"}'],
    ["data as a string", '{"event":"charge.success","data":"x"}'],
  ])("acknowledges a signed body that is %s", async (_label, body) => {
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(findUnique).not.toHaveBeenCalled();
    expectUntouched();
  });
});

describe("POST /api/paystack/webhook — failures and logging", () => {
  it("500s when the database is unreachable, so Paystack retries", async () => {
    // A retry is what gets this order paid once the database is back; the
    // compare-and-set makes the retried delivery safe.
    findUnique.mockRejectedValue(new Error("connection refused"));
    const res = await post(chargeEvent());
    expect(res.status).toBe(500);
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("logs ids only — never the body, the customer's email or the key", async () => {
    await post(chargeEvent({ amount: 1 })); // mismatch: logged
    await post(chargeEvent(), "bad"); // bad signature: logged
    findUnique.mockRejectedValue(new Error("connection refused"));
    await post(chargeEvent()); // database failure: logged
    const logged = JSON.stringify(errorLog.mock.calls);
    expect(errorLog).toHaveBeenCalled();
    expect(logged).not.toContain("ada@example.com");
    expect(logged).not.toContain(SECRET);
    expect(logged).not.toContain("charge.success");
  });
});
