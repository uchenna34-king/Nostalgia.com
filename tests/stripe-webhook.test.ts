import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// This route is the single source of truth for payment status (D-04). Every
// test below asserts BOTH the HTTP response AND the absence/presence of the
// two side effects that matter: the order-status write and the confirmation
// email send — never one without checking the other, since a false-positive
// 200 with a stray write or a stray email is exactly the bug this route
// exists to prevent.
const constructEvent = vi.fn();
const findUnique = vi.fn();
const orderUpdate = vi.fn();
const sendOrderConfirmationMock = vi.fn();
const headersGet = vi.fn();

// Static mocks — behavior does not vary across describe blocks.
vi.mock("@/lib/db", () => ({
  prisma: {
    order: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      update: (...a: unknown[]) => orderUpdate(...a),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendOrderConfirmation: (...a: unknown[]) => sendOrderConfirmationMock(...a),
}));

vi.mock("next/headers", () => ({
  headers: () => ({ get: (...a: unknown[]) => headersGet(...a) }),
}));

function makeSessionEvent(
  type: string,
  metadata: Record<string, string> | null = { orderId: "order_1" },
) {
  return {
    id: "evt_1",
    type,
    data: {
      // metadata omitted entirely (not set to `undefined`) when null is
      // passed, matching what a real Stripe session with no metadata looks
      // like — passing `undefined` as an object property would still leave
      // the key present, which is not what we want to simulate here.
      object: metadata === null ? {} : { metadata },
    },
  };
}

function makeRequest(rawBody: string) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: rawBody,
  });
}

// Deliberately NOT the same shape constructEvent will resolve to — proves the
// handler passes THIS exact raw string through, not a re-serialized event.
const RAW_BODY = '{"id":"evt_1","type":"checkout.session.completed","raw":true}';

const ORIGINAL_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  headersGet.mockReturnValue("t=123,v1=validsig");
  // Fully mocked constructEvent — this is not a real secret, just a
  // realistic non-empty value so the handler's `process.env...!` read
  // behaves as it will once the owner sets the real one (deferred to 11-07).
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
});

afterEach(() => {
  vi.doUnmock("@/lib/stripe");
  process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_WEBHOOK_SECRET;
});

describe("POST /api/stripe/webhook — stub/demo mode (no Stripe key)", () => {
  beforeEach(() => {
    vi.doMock("@/lib/stripe", () => ({ stripe: null }));
  });

  it("returns 200 received:true without verifying, writing, or emailing", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const res = await POST(makeRequest(RAW_BODY));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(constructEvent).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — Stripe configured", () => {
  beforeEach(() => {
    vi.doMock("@/lib/stripe", () => ({
      stripe: {
        webhooks: { constructEvent: (...a: unknown[]) => constructEvent(...a) },
      },
    }));
  });

  it("missing stripe-signature header returns 400 and never writes or emails", async () => {
    headersGet.mockReturnValue(null);
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const res = await POST(makeRequest(RAW_BODY));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_signature" });
    expect(constructEvent).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("constructEvent throwing (invalid/forged signature) returns 400 and never writes or emails", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("signature verification failed");
    });
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const res = await POST(makeRequest(RAW_BODY));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_signature" });
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("verifies constructEvent against the exact raw body string from req.text(), not a re-serialized object", async () => {
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
    findUnique.mockResolvedValue({ id: "order_1", status: "pending" });
    const { POST } = await import("@/app/api/stripe/webhook/route");

    await POST(makeRequest(RAW_BODY));

    expect(constructEvent).toHaveBeenCalledWith(
      RAW_BODY,
      "t=123,v1=validsig",
      expect.any(String),
    );
  });

  it("a verified checkout.session.completed for a pending order flips status to paid and sends exactly one confirmation email", async () => {
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
    findUnique.mockResolvedValue({ id: "order_1", status: "pending" });
    const { POST } = await import("@/app/api/stripe/webhook/route");

    const res = await POST(makeRequest(RAW_BODY));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(orderUpdate).toHaveBeenCalledTimes(1);
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { status: "paid" },
    });
    expect(sendOrderConfirmationMock).toHaveBeenCalledTimes(1);
    expect(sendOrderConfirmationMock).toHaveBeenCalledWith("order_1");
  });

  it("a duplicate delivery of the same event for an already-paid order is a safe no-op (idempotency)", async () => {
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
    findUnique.mockResolvedValue({ id: "order_1", status: "paid" });
    const { POST } = await import("@/app/api/stripe/webhook/route");

    const res = await POST(makeRequest(RAW_BODY));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it.each(["fulfilled", "cancelled"] as const)(
    "an order already %s is never re-flipped to paid or re-emailed",
    async (status) => {
      constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
      findUnique.mockResolvedValue({ id: "order_1", status });
      const { POST } = await import("@/app/api/stripe/webhook/route");

      const res = await POST(makeRequest(RAW_BODY));

      expect(res.status).toBe(200);
      expect(orderUpdate).not.toHaveBeenCalled();
      expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
    },
  );

  it("checkout.session.completed with no metadata.orderId performs no lookup, no update, no email", async () => {
    constructEvent.mockReturnValue(
      makeSessionEvent("checkout.session.completed", null),
    );
    const { POST } = await import("@/app/api/stripe/webhook/route");

    const res = await POST(makeRequest(RAW_BODY));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(findUnique).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("metadata.orderId pointing at a non-existent order (findUnique -> null) is a safe no-op", async () => {
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
    findUnique.mockResolvedValue(null);
    const { POST } = await import("@/app/api/stripe/webhook/route");

    const res = await POST(makeRequest(RAW_BODY));

    expect(res.status).toBe(200);
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("a non-subscribed event type (e.g. a payment-intent event) is a safe no-op", async () => {
    constructEvent.mockReturnValue(makeSessionEvent("payment_intent.succeeded"));
    const { POST } = await import("@/app/api/stripe/webhook/route");

    const res = await POST(makeRequest(RAW_BODY));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(findUnique).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });
});
