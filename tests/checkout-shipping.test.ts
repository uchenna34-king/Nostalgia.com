import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateShipping, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/shipping";

describe("calculateShipping", () => {
  it("charges the flat fee below the free-shipping threshold", () => {
    expect(calculateShipping(0)).toBe(SHIPPING_FEE);
    expect(calculateShipping(FREE_SHIPPING_THRESHOLD - 1)).toBe(SHIPPING_FEE);
  });

  it("is free at and above the threshold", () => {
    expect(calculateShipping(FREE_SHIPPING_THRESHOLD)).toBe(0);
    expect(calculateShipping(FREE_SHIPPING_THRESHOLD + 1)).toBe(0);
  });
});

// The checkout API route is the single place that decides what Stripe
// actually charges and what gets persisted to Order.total. A prior bug
// (commit 540f395, and the mirror-image version this test suite guards
// against) let those two numbers drift apart because the UI, the DB write,
// and the Stripe line items each computed shipping independently. Every test
// below asserts Order.total against the SUM OF THE ACTUAL STRIPE LINE ITEMS
// (or, in stub mode, against what a real Stripe charge would have been) —
// not against a re-derivation of the same formula the route itself uses.
const getServerSession = vi.fn();
const findMany = vi.fn();
const orderCreate = vi.fn();
const stripeSessionsCreate = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...a: unknown[]) => getServerSession(...a),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findMany: (...a: unknown[]) => findMany(...a) },
    order: { create: (...a: unknown[]) => orderCreate(...a) },
  },
}));

const CHEAP_PRODUCT = {
  slug: "tote",
  name: "Nostalgia Tote",
  price: 4500, // $45
  sizes: JSON.stringify(["One Size"]),
  images: [{ url: "https://example.test/tote.jpg" }],
};

const EXPENSIVE_PRODUCT = {
  slug: "coat",
  name: "Nostalgia Coat",
  price: 26000, // $260 — alone, already clears the $200 free-shipping threshold
  sizes: JSON.stringify(["M"]),
  images: [{ url: "https://example.test/coat.jpg" }],
};

function request(items: Array<{ slug: string; size: string; qty: number }>) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  getServerSession.mockResolvedValue({
    user: { id: "user-1", email: "shopper@example.test" },
  });
  findMany.mockResolvedValue([CHEAP_PRODUCT, EXPENSIVE_PRODUCT]);
  orderCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "order_1",
    ...data,
  }));
});

afterEach(() => {
  vi.doUnmock("@/lib/stripe");
});

describe("checkout route — Stripe test mode (STRIPE_SECRET_KEY configured)", () => {
  beforeEach(() => {
    stripeSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session_1" });
    vi.doMock("@/lib/stripe", () => ({
      stripe: { checkout: { sessions: { create: (...a: unknown[]) => stripeSessionsCreate(...a) } } },
    }));
  });

  it("below the free-shipping threshold: Order.total equals the SUM of the actual Stripe line items, including the shipping line", async () => {
    const { POST } = await import("@/app/api/checkout/route");

    await POST(request([{ slug: "tote", size: "One Size", qty: 1 }]));

    expect(stripeSessionsCreate).toHaveBeenCalledTimes(1);
    const call = stripeSessionsCreate.mock.calls[0][0];
    const stripeCharge = call.line_items.reduce(
      (sum: number, li: { quantity: number; price_data: { unit_amount: number } }) =>
        sum + li.quantity * li.price_data.unit_amount,
      0,
    );

    expect(stripeCharge).toBe(4500 + SHIPPING_FEE);

    const orderTotal = orderCreate.mock.calls[0][0].data.total;
    expect(orderTotal).toBe(stripeCharge);

    // The shipping fee is an explicit, separate line item — not folded
    // silently into a product line's price. Identified by amount/currency
    // rather than its display label, which is cosmetic copy and not this
    // test's concern.
    expect(call.line_items).toHaveLength(2);
    const shippingLine = call.line_items.find(
      (li: { price_data: { unit_amount: number } }) =>
        li.price_data.unit_amount === SHIPPING_FEE,
    );
    expect(shippingLine).toBeDefined();
    expect(shippingLine.price_data.currency).toBe("usd");
  });

  it("at/above the free-shipping threshold: no shipping line item is added, and Order.total equals the product-only Stripe charge", async () => {
    const { POST } = await import("@/app/api/checkout/route");

    await POST(request([{ slug: "coat", size: "M", qty: 1 }]));

    const call = stripeSessionsCreate.mock.calls[0][0];
    const shippingLine = call.line_items.find(
      (li: { price_data: { product_data: { name: string } } }) =>
        li.price_data.product_data.name === "Shipping",
    );
    expect(shippingLine).toBeUndefined();

    const stripeCharge = call.line_items.reduce(
      (sum: number, li: { quantity: number; price_data: { unit_amount: number } }) =>
        sum + li.quantity * li.price_data.unit_amount,
      0,
    );
    expect(stripeCharge).toBe(26000);

    const orderTotal = orderCreate.mock.calls[0][0].data.total;
    expect(orderTotal).toBe(stripeCharge);
  });
});

describe("checkout route — stub mode (no STRIPE_SECRET_KEY)", () => {
  beforeEach(() => {
    vi.doMock("@/lib/stripe", () => ({ stripe: null }));
  });

  it("still adds shipping to Order.total below the threshold, matching what a real Stripe charge would have been", async () => {
    const { POST } = await import("@/app/api/checkout/route");

    await POST(request([{ slug: "tote", size: "One Size", qty: 1 }]));

    expect(stripeSessionsCreate).not.toHaveBeenCalled();
    const orderTotal = orderCreate.mock.calls[0][0].data.total;
    expect(orderTotal).toBe(4500 + SHIPPING_FEE);
    expect(orderCreate.mock.calls[0][0].data.status).toBe("paid");
  });
});
