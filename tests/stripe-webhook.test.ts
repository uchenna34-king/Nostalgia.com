import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// This route is one of the two places a real payment marks an order paid
// (D-04, D-22). Every test below asserts BOTH the HTTP response AND the two
// side effects that matter: the order-status write and the confirmation
// email — never one without the other, since a false-positive 200 with a
// stray write or a stray email is exactly the bug this route exists to
// prevent. lib/payments.ts runs for real; the database is a one-order fake
// whose updateMany applies the same where-clause matching Postgres would.
const constructEvent = vi.fn();
const findUnique = vi.fn();
const updateMany = vi.fn();
const sendOrderConfirmationMock = vi.fn();
const headersGet = vi.fn();

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
  sendOrderConfirmation: (...a: unknown[]) => sendOrderConfirmationMock(...a),
}));

vi.mock("next/headers", () => ({
  headers: () => ({ get: (...a: unknown[]) => headersGet(...a) }),
}));

function makeSessionEvent(
  type: string,
  session: Record<string, unknown> | null = {},
) {
  return {
    id: "evt_1",
    type,
    data: {
      // metadata omitted entirely when null is passed, matching what a real
      // Stripe session with no metadata looks like.
      object:
        session === null
          ? { payment_status: "paid", amount_total: 28_500, currency: "usd" }
          : {
              metadata: { orderId: "order_1" },
              payment_status: "paid",
              amount_total: 28_500,
              currency: "usd",
              ...session,
            },
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
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

  order = {
    id: "order_1",
    status: "pending",
    total: 28_500,
    currency: "USD",
    paymentProvider: "stripe",
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
    expect(updateMany).not.toHaveBeenCalled();
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

  async function deliver() {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    return POST(makeRequest(RAW_BODY));
  }

  it("missing stripe-signature header returns 400 and never writes or emails", async () => {
    headersGet.mockReturnValue(null);
    const res = await deliver();

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_signature" });
    expect(constructEvent).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("constructEvent throwing (invalid/forged signature) returns 400 and never writes or emails", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("signature verification failed");
    });
    const res = await deliver();

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_signature" });
    expect(updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("verifies constructEvent against the exact raw body string from req.text(), not a re-serialized object", async () => {
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
    await deliver();

    expect(constructEvent).toHaveBeenCalledWith(
      RAW_BODY,
      "t=123,v1=validsig",
      expect.any(String),
    );
  });

  it("a paid session matching the order's amount and currency marks it paid and sends one email", async () => {
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "order_1",
        status: "pending",
        total: 28_500,
        currency: "USD",
        paymentProvider: "stripe",
      },
      data: { status: "paid" },
    });
    expect(order!.status).toBe("paid");
    expect(sendOrderConfirmationMock).toHaveBeenCalledTimes(1);
    expect(sendOrderConfirmationMock).toHaveBeenCalledWith("order_1");
  });

  it("a duplicate delivery of the same event is a safe no-op (one email in total)", async () => {
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
    await deliver();
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(order!.status).toBe("paid");
    expect(sendOrderConfirmationMock).toHaveBeenCalledTimes(1);
  });

  it.each(["paid", "fulfilled", "cancelled"] as const)(
    "an order already %s is never re-flipped or re-emailed",
    async (status) => {
      order!.status = status;
      constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
      const res = await deliver();

      expect(res.status).toBe(200);
      expect(order!.status).toBe(status);
      expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["an unpaid session (async payment still pending)", { payment_status: "unpaid" }],
    ["a session paid for a different amount", { amount_total: 28_499 }],
    ["a session in a different currency", { currency: "ngn" }],
    ["a session with no amount", { amount_total: null }],
  ])("%s never marks the order paid", async (_label, session) => {
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed", session));
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(updateMany).not.toHaveBeenCalled();
    expect(order!.status).toBe("pending");
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("an order created for Paystack is never paid by a Stripe session", async () => {
    order!.paymentProvider = "paystack";
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(order!.status).toBe("pending");
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("a naira order is never paid by a dollar session of the same number", async () => {
    order!.currency = "NGN";
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(order!.status).toBe("pending");
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("checkout.session.completed with no metadata.orderId performs no lookup, no update, no email", async () => {
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed", null));
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(findUnique).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("metadata.orderId pointing at a non-existent order is a safe no-op", async () => {
    order = null;
    constructEvent.mockReturnValue(makeSessionEvent("checkout.session.completed"));
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("a non-subscribed event type (e.g. a payment-intent event) is a safe no-op", async () => {
    constructEvent.mockReturnValue(makeSessionEvent("payment_intent.succeeded"));
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(findUnique).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });
});
