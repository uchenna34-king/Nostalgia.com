import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// POST /api/checkout is the one place that decides what a customer is charged
// and what is stored as Order.total (D-17). Every price is re-read from the
// database in the order's currency, shipping comes from lib/shipping.ts, and
// the provider is chosen on the server (D-18). Each test checks the HTTP
// reply AND the side effects: order rows, provider calls, emails.
const getServerSession = vi.fn();
const findMany = vi.fn();
const orderCreate = vi.fn();
const orderUpdate = vi.fn();
const sendOrderConfirmation = vi.fn();
const sessionsCreate = vi.fn();
const initializeTransaction = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...a: unknown[]) => getServerSession(...a),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findMany: (...a: unknown[]) => findMany(...a) },
    order: {
      create: (...a: unknown[]) => orderCreate(...a),
      update: (...a: unknown[]) => orderUpdate(...a),
    },
  },
}));
vi.mock("@/lib/email", () => ({
  sendOrderConfirmation: (...a: unknown[]) => sendOrderConfirmation(...a),
}));

const ORIGIN = "https://shop.test";

const TOTE = {
  slug: "tote",
  name: "Nostalgia Tote",
  priceNgn: 6_750_000, // ₦67,500
  priceUsd: 4_500, // $45
  priceUsdOverride: 4_500,
  sizes: JSON.stringify(["One Size"]),
  images: [{ url: "https://example.test/tote.jpg" }],
};
const COAT = {
  slug: "coat",
  name: "Nostalgia Coat",
  priceNgn: 39_000_000, // ₦390,000 — alone clears the ₦250,000 domestic threshold
  priceUsd: 26_000, // $260 — alone clears the $200 domestic threshold
  priceUsdOverride: null,
  sizes: JSON.stringify(["M"]),
  images: [{ url: "https://example.test/coat.jpg" }],
};
const VAULT = {
  ...COAT,
  slug: "vault",
  name: "Vault Piece",
  priceNgn: 2_000_000_000,
  priceUsd: 2_000_000_000,
};
const PRODUCTS = [TOTE, COAT, VAULT];

const LAGOS = {
  fullName: "Ada Obi",
  phone: "+234 803 123 4567",
  line1: "12 Admiralty Way",
  city: "Lekki",
  region: "Lagos",
  country: "NG",
};
const LONDON = {
  fullName: "Ada Obi",
  phone: "+44 20 7946 0000",
  line1: "1 Example Street",
  city: "London",
  region: "Greater London",
  postalCode: "SW1A 1AA",
  country: "GB",
};

const tote = { slug: "tote", size: "One Size", qty: 1 };
const coat = { slug: "coat", size: "M", qty: 1 };

function request(body: unknown) {
  return new Request(`${ORIGIN}/api/checkout`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Load the route with the chosen provider clients present or absent. */
async function load({ stripe = true, paystack = true } = {}) {
  vi.doMock("@/lib/stripe", () => ({
    stripe: stripe ? { checkout: { sessions: { create: sessionsCreate } } } : null,
  }));
  vi.doMock("@/lib/paystack", () => ({
    paystackEnabled: paystack,
    initializeTransaction: (...a: unknown[]) => initializeTransaction(...a),
  }));
  const { POST } = await import("@/app/api/checkout/route");
  return POST;
}

async function checkout(body: unknown, providers?: { stripe?: boolean; paystack?: boolean }) {
  const POST = await load(providers);
  const res = await POST(request(body));
  return { res, json: await res.json() };
}

const created = () => orderCreate.mock.calls[0][0].data;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv("NEXTAUTH_URL", ORIGIN);
  vi.stubEnv("USD_PAYMENT_PROVIDER", "");
  vi.stubEnv("ALLOW_DEMO_CHECKOUT", "");
  getServerSession.mockResolvedValue({ user: { email: "ada@example.test", id: "user_1" } });
  findMany.mockImplementation(async ({ where }: { where: { slug: { in: string[] } } }) =>
    PRODUCTS.filter((p) => where.slug.in.includes(p.slug)),
  );
  orderCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "order_1",
    ...data,
  }));
  orderUpdate.mockResolvedValue({});
  sessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.test/s/1" });
  initializeTransaction.mockResolvedValue({
    authorizationUrl: "https://checkout.paystack.test/abc",
    reference: "order_1",
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/lib/stripe");
  vi.doUnmock("@/lib/paystack");
});

describe("checkout: requests refused before any order exists", () => {
  it("401 when not signed in", async () => {
    getServerSession.mockResolvedValue(null);
    const { res, json } = await checkout({ items: [tote], currency: "NGN", address: LAGOS });
    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "not_authenticated" });
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("400 for a body that isn't JSON", async () => {
    const { res } = await checkout("{nope");
    expect(res.status).toBe(400);
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("400 for an empty bag", async () => {
    const { res, json } = await checkout({ items: [], currency: "NGN", address: LAGOS });
    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "empty_cart" });
  });

  it.each([undefined, "EUR", "ngn", 1, null])("400 for currency %j", async (currency) => {
    const { res, json } = await checkout({ items: [tote], currency, address: LAGOS });
    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "invalid_currency" });
    expect(findMany).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["no address", undefined, ["fullName", "phone", "line1", "city", "region", "country"]],
    ["an unknown country", { ...LAGOS, country: "XX" }, ["country"]],
    ["a destination we don't ship to", { ...LAGOS, country: "KP", region: "Pyongyang" }, ["country"]],
    ["a Nigerian state that doesn't exist", { ...LAGOS, region: "Narnia" }, ["region"]],
  ])("400 invalid_address for %s, naming the fields", async (_label, address, fields) => {
    const { res, json } = await checkout({ items: [tote], currency: "NGN", address });
    expect(res.status).toBe(400);
    expect(json.error).toBe("invalid_address");
    expect(Object.keys(json.fields).sort()).toEqual([...fields].sort());
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("500 when the site URL isn't configured (no fallback origin)", async () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    const { res, json } = await checkout({ items: [tote], currency: "NGN", address: LAGOS });
    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "server_misconfigured" });
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("400 when no line is a real product in a real size", async () => {
    const { res, json } = await checkout({
      items: [{ slug: "tote", size: "XXL", qty: 1 }, { slug: "ghost", size: "M", qty: 1 }],
      currency: "NGN",
      address: LAGOS,
    });
    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "no_valid_items" });
  });

  it("400 when the total wouldn't fit the INTEGER column", async () => {
    const { res, json } = await checkout({
      items: [{ slug: "vault", size: "M", qty: 2 }],
      currency: "NGN",
      address: LAGOS,
    });
    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "order_too_large" });
    expect(orderCreate).not.toHaveBeenCalled();
  });
});

describe("checkout in naira → Paystack (D-18, D-19)", () => {
  it("prices every line in naira from the database and adds domestic shipping", async () => {
    const { res, json } = await checkout({ items: [{ ...tote, qty: 2 }], currency: "NGN", address: LAGOS });
    expect(res.status).toBe(200);
    expect(json).toEqual({ url: "https://checkout.paystack.test/abc" });
    expect(created()).toMatchObject({
      status: "pending",
      currency: "NGN",
      paymentProvider: "paystack",
      total: 2 * 6_750_000 + 500_000,
      userId: "user_1",
      email: "ada@example.test",
    });
    expect(JSON.parse(created().items)[0]).toMatchObject({ unitPrice: 6_750_000, qty: 2 });
  });

  it("hands Paystack exactly the stored total, keyed by the order id", async () => {
    await checkout({ items: [tote], currency: "NGN", address: LAGOS });
    expect(initializeTransaction).toHaveBeenCalledWith({
      email: "ada@example.test",
      amountMinor: created().total,
      currency: "NGN",
      reference: "order_1",
      callbackUrl: `${ORIGIN}/api/paystack/callback`,
      cancelUrl: `${ORIGIN}/checkout?payment=cancelled`,
    });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("stores the validated address, not the raw input", async () => {
    await checkout({
      items: [tote],
      currency: "NGN",
      address: { ...LAGOS, fullName: "  Ada Obi  ", extra: "<script>" },
    });
    expect(JSON.parse(created().shippingAddress)).toEqual(LAGOS);
  });

  it("ships free at the ₦250,000 threshold", async () => {
    await checkout({ items: [coat], currency: "NGN", address: LAGOS });
    expect(created().total).toBe(39_000_000);
  });

  it("charges international shipping in naira outside Nigeria", async () => {
    await checkout({ items: [tote], currency: "NGN", address: LONDON });
    expect(created().total).toBe(6_750_000 + 6_000_000);
  });
});

describe("checkout in dollars → Stripe (D-23)", () => {
  type LineItem = { quantity: number; price_data: { currency: string; unit_amount: number; product_data: { name: string } } };
  const stripeArgs = () => sessionsCreate.mock.calls[0][0];
  const lines = () => stripeArgs().line_items as LineItem[];

  it("charges in usd, and the line items add up to exactly Order.total", async () => {
    const { res, json } = await checkout({ items: [{ ...tote, qty: 2 }], currency: "USD", address: LAGOS });
    expect(res.status).toBe(200);
    expect(json).toEqual({ url: "https://checkout.stripe.test/s/1" });
    expect(created()).toMatchObject({ currency: "USD", paymentProvider: "stripe", status: "pending" });
    expect(created().total).toBe(2 * 4_500 + 500);
    expect(lines().every((l) => l.price_data.currency === "usd")).toBe(true);
    const sum = lines().reduce((s, l) => s + l.quantity * l.price_data.unit_amount, 0);
    expect(sum).toBe(created().total);
    // The shipping line is found by amount, not by name.
    expect(lines().filter((l) => l.price_data.unit_amount === 500)).toHaveLength(1);
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("adds no shipping line at the $200 threshold", async () => {
    await checkout({ items: [coat], currency: "USD", address: LAGOS });
    expect(lines()).toHaveLength(1);
    expect(created().total).toBe(26_000);
  });

  it("returns to the success page with the order and currency, and keeps Stripe's own extras off", async () => {
    await checkout({ items: [tote], currency: "USD", address: LONDON });
    const args = stripeArgs();
    expect(args.success_url).toBe(
      `${ORIGIN}/order/success?order=order_1&session_id={CHECKOUT_SESSION_ID}&currency=USD`,
    );
    expect(args.cancel_url).toBe(`${ORIGIN}/cart`);
    expect(args.metadata).toEqual({ orderId: "order_1" });
    expect(args.customer_email).toBe("ada@example.test");
    // Any of these could make Stripe charge more than Order.total.
    expect(args).not.toHaveProperty("shipping_address_collection");
    expect(args).not.toHaveProperty("automatic_tax");
    expect(args).not.toHaveProperty("allow_promotion_codes");
  });

  it('routes dollars through Paystack only when USD_PAYMENT_PROVIDER is exactly "paystack"', async () => {
    vi.stubEnv("USD_PAYMENT_PROVIDER", "paystack");
    await checkout({ items: [tote], currency: "USD", address: LAGOS });
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "USD", amountMinor: 5_000 }),
    );
    expect(created().paymentProvider).toBe("paystack");
  });

  it.each(["Paystack", " paystack", "stripe", ""])(
    "keeps dollars on Stripe for USD_PAYMENT_PROVIDER=%j",
    async (value) => {
      vi.stubEnv("USD_PAYMENT_PROVIDER", value);
      await checkout({ items: [tote], currency: "USD", address: LAGOS });
      expect(sessionsCreate).toHaveBeenCalledTimes(1);
      expect(initializeTransaction).not.toHaveBeenCalled();
    },
  );
});

describe("checkout with no payment key (D-24)", () => {
  it("returns 503 on production and creates nothing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { res, json } = await checkout(
      { items: [tote], currency: "NGN", address: LAGOS },
      { paystack: false },
    );
    expect(res.status).toBe(503);
    expect(json).toEqual({ error: "payments_unavailable" });
    expect(orderCreate).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("returns 503 on production for dollars too when Stripe has no key", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { res } = await checkout({ items: [tote], currency: "USD", address: LAGOS }, { stripe: false });
    expect(res.status).toBe(503);
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('runs the demo on production only with ALLOW_DEMO_CHECKOUT="true"', async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_DEMO_CHECKOUT", "true");
    const { res, json } = await checkout(
      { items: [tote], currency: "NGN", address: LAGOS },
      { paystack: false },
    );
    expect(res.status).toBe(200);
    expect(created()).toMatchObject({
      status: "paid",
      paymentProvider: "demo",
      currency: "NGN",
      total: 6_750_000 + 500_000,
    });
    expect(sendOrderConfirmation).toHaveBeenCalledWith("order_1");
    expect(json).toEqual({ url: `${ORIGIN}/order/success?order=order_1&demo=1&currency=NGN` });
  });

  it("allows the demo outside production (local development)", async () => {
    const { res } = await checkout(
      { items: [tote], currency: "USD", address: LAGOS },
      { stripe: false },
    );
    expect(res.status).toBe(200);
    expect(created()).toMatchObject({ status: "paid", paymentProvider: "demo", currency: "USD" });
  });
});

describe("checkout when bag prices are out of date (Open Question 6)", () => {
  it("409 price_changed with current prices in both currencies, and no order", async () => {
    const { res, json } = await checkout({
      items: [tote, coat],
      currency: "NGN",
      address: LAGOS,
      expectedTotal: 1,
    });
    expect(res.status).toBe(409);
    expect(json.error).toBe("price_changed");
    expect(json.prices).toEqual(
      expect.arrayContaining([
        { slug: "tote", NGN: 6_750_000, USD: 4_500 },
        { slug: "coat", NGN: 39_000_000, USD: 26_000 },
      ]),
    );
    expect(orderCreate).not.toHaveBeenCalled();
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("goes ahead when the bag's total matches the server's", async () => {
    const { res } = await checkout({
      items: [tote],
      currency: "NGN",
      address: LAGOS,
      expectedTotal: 6_750_000 + 500_000,
    });
    expect(res.status).toBe(200);
    expect(orderCreate).toHaveBeenCalledTimes(1);
  });
});

describe("checkout when the provider fails", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

  it("cancels the order and returns 502 when Paystack throws", async () => {
    initializeTransaction.mockRejectedValue(new Error("paystack_500"));
    const { res, json } = await checkout({ items: [tote], currency: "NGN", address: LAGOS });
    expect(res.status).toBe(502);
    expect(json).toEqual({ error: "payment_provider_error" });
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { status: "cancelled" },
    });
  });

  it("cancels the order and returns 502 when Stripe throws or returns no URL", async () => {
    sessionsCreate.mockRejectedValueOnce(new Error("stripe down"));
    let { res } = await checkout({ items: [tote], currency: "USD", address: LAGOS });
    expect(res.status).toBe(502);
    expect(orderUpdate).toHaveBeenCalledTimes(1);

    vi.resetModules();
    orderUpdate.mockClear();
    sessionsCreate.mockResolvedValueOnce({ url: null });
    ({ res } = await checkout({ items: [tote], currency: "USD", address: LAGOS }));
    expect(res.status).toBe(502);
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { status: "cancelled" },
    });
  });
});
