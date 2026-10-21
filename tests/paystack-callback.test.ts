// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Where Paystack sends the shopper after paying (D-21). The browser's word
// counts for nothing: the route asks Paystack itself (verifyTransaction, with
// the secret key) and pays the order only on a verified match. As in the
// webhook tests, lib/paystack-verify.ts and lib/payments.ts run for real
// against a one-order fake database, and every case checks the redirect AND
// the status write AND the email.
//
// The notice the shopper lands on has to be true (UI-SPEC A-5): "you haven't
// been charged" (failed / cancelled) only when Paystack says so; whenever
// money may have moved, "pending" (don't pay again, we'll email you).
const findUnique = vi.fn();
const updateMany = vi.fn();
const sendOrderConfirmation = vi.fn();
const verifyTransaction = vi.fn();

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

vi.mock("@/lib/paystack", () => ({
  verifyTransaction: (...a: unknown[]) => verifyTransaction(...a),
}));

const ORIGIN = "https://nostalgia.test";
const ORDER_ID = "cmorder0000000000000000001";
const SUCCESS = `${ORIGIN}/order/success?order=${ORDER_ID}&currency=NGN`;
const notice = (kind: string) => `${ORIGIN}/checkout?payment=${kind}`;

const paidTx = (over: Record<string, unknown> = {}) => ({
  status: "success",
  reference: ORDER_ID,
  amount: 4_500_000,
  currency: "NGN",
  ...over,
});

async function visit(query: string, base = "http://localhost") {
  const { GET } = await import("@/app/api/paystack/callback/route");
  return GET(new Request(`${base}/api/paystack/callback${query}`));
}

let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv("NEXTAUTH_URL", ORIGIN);
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
  verifyTransaction.mockResolvedValue(paidTx());
});

afterEach(() => {
  vi.unstubAllEnvs();
  errorLog.mockRestore();
});

function expectRedirect(res: Response, location: string) {
  expect(res.status).toBe(303);
  expect(res.headers.get("location")).toBe(location);
}

/** Nothing written, nothing sent. */
function expectUnpaid(status = "pending") {
  expect(updateMany).not.toHaveBeenCalled();
  expect(sendOrderConfirmation).not.toHaveBeenCalled();
  if (order) expect(order.status).toBe(status);
}

describe("GET /api/paystack/callback — configuration", () => {
  // First in the file, so it pays for the cold import of the route and
  // next/server: room for a loaded full run, as in tests/admin.test.ts.
  it("is rendered per request on Node (a cached redirect would replay one shopper's result)", async () => {
    const route = await import("@/app/api/paystack/callback/route");
    expect(route.dynamic).toBe("force-dynamic");
    expect(route.runtime).toBe("nodejs");
  }, 30_000);

  it("500s without NEXTAUTH_URL, before asking Paystack or the database", async () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    const res = await visit(`?reference=${ORDER_ID}`);
    expect(res.status).toBe(500);
    expect(res.headers.get("location")).toBeNull();
    expect(verifyTransaction).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
    expectUnpaid();
  });

  it("is never cached by a browser or the CDN", async () => {
    const res = await visit(`?reference=${ORDER_ID}`);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});

describe("GET /api/paystack/callback — a verified payment", () => {
  it("marks the order paid, sends one confirmation and shows the success page", async () => {
    const res = await visit(`?trxref=${ORDER_ID}&reference=${ORDER_ID}`);
    expectRedirect(res, SUCCESS);
    expect(verifyTransaction).toHaveBeenCalledWith(ORDER_ID);
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

  it("falls back to trxref when reference is missing or empty", async () => {
    expectRedirect(await visit(`?trxref=${ORDER_ID}`), SUCCESS);
    expectRedirect(await visit(`?reference=&trxref=${ORDER_ID}`), SUCCESS);
    expect(sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it("carries a dollar order's own currency to the success page", async () => {
    order = { ...order!, total: 28_500, currency: "USD" };
    verifyTransaction.mockResolvedValue(paidTx({ amount: 28_500, currency: "USD" }));
    const res = await visit(`?reference=${ORDER_ID}`);
    expectRedirect(res, `${ORIGIN}/order/success?order=${ORDER_ID}&currency=USD`);
    expect(order!.status).toBe("paid");
  });

  it("shows success again on a second visit, with no second email", async () => {
    expectRedirect(await visit(`?reference=${ORDER_ID}`), SUCCESS);
    expectRedirect(await visit(`?reference=${ORDER_ID}`), SUCCESS);
    expect(sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it.each(["paid", "fulfilled"])(
    "shows success for an order the webhook already settled (%s), without asking Paystack",
    async (status) => {
      order!.status = status;
      const res = await visit(`?reference=${ORDER_ID}`);
      expectRedirect(res, SUCCESS);
      expect(verifyTransaction).not.toHaveBeenCalled();
      expectUnpaid(status);
    },
  );

  it("shows success when the webhook wins the race after the check", async () => {
    verifyTransaction.mockImplementation(async () => {
      order!.status = "paid"; // the webhook lands while Paystack is answering
      return paidTx();
    });
    const res = await visit(`?reference=${ORDER_ID}`);
    expectRedirect(res, SUCCESS);
    expect(order!.status).toBe("paid");
    // The webhook sent the email; the callback's switch matched nothing.
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("never revives a cancelled order — and doesn't tell a charged shopper they weren't", async () => {
    order!.status = "cancelled";
    const res = await visit(`?reference=${ORDER_ID}`);
    expectRedirect(res, notice("pending"));
    expect(order!.status).toBe("cancelled");
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalled();
  });
});

describe("GET /api/paystack/callback — not paid", () => {
  it("shows 'cancelled' for an abandoned payment and leaves the order pending", async () => {
    // Never cancel here: the shopper may retry on Paystack's page, and a late
    // webhook can still pay this order (Pitfall 17).
    verifyTransaction.mockResolvedValue(paidTx({ status: "abandoned" }));
    expectRedirect(await visit(`?reference=${ORDER_ID}`), notice("cancelled"));
    expectUnpaid();
  });

  it.each(["failed", "reversed"])("shows 'failed' for a %s payment", async (status) => {
    verifyTransaction.mockResolvedValue(paidTx({ status }));
    expectRedirect(await visit(`?reference=${ORDER_ID}`), notice("failed"));
    expectUnpaid();
  });

  it.each(["ongoing", "pending", "processing", "queued"])(
    "shows 'pending' while the payment is %s",
    async (status) => {
      verifyTransaction.mockResolvedValue(paidTx({ status }));
      expectRedirect(await visit(`?reference=${ORDER_ID}`), notice("pending"));
      expectUnpaid();
    },
  );

  it.each([
    ["a different amount", { amount: 4_499_900 }],
    ["a different currency", { currency: "USD" }],
  ])(
    "shows 'pending', never success or 'not charged', for a charge with %s",
    async (_label, over) => {
      // Money moved, but not what this order was created for: it needs the
      // owner, and the shopper must not be told to pay again.
      verifyTransaction.mockResolvedValue(paidTx(over));
      expectRedirect(await visit(`?reference=${ORDER_ID}`), notice("pending"));
      expectUnpaid();
      expect(errorLog).toHaveBeenCalled();
    },
  );

  it("shows 'pending', never success, when Paystack can't be reached", async () => {
    verifyTransaction.mockRejectedValue(new Error("paystack_network"));
    expectRedirect(await visit(`?reference=${ORDER_ID}`), notice("pending"));
    expectUnpaid();
  });

  it("shows 'pending', never success, when the database fails mid-way", async () => {
    updateMany.mockRejectedValue(new Error("connection refused"));
    expectRedirect(await visit(`?reference=${ORDER_ID}`), notice("pending"));
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });
});

describe("GET /api/paystack/callback — references that aren't ours", () => {
  it.each([
    ["missing", ""],
    ["empty", "?reference="],
    ["too short", "?reference=abc"],
    ["too long", `?reference=${"x".repeat(65)}`],
    ["a path", "?reference=..%2F..%2Fadmin"],
    ["a protocol-relative URL", "?reference=%2F%2Fevil.test"],
    ["a URL", "?reference=https%3A%2F%2Fevil.test"],
    ["a query string", `?reference=${ORDER_ID}%3Fx%3D1`],
  ])("shows 'failed' for a reference that is %s, asking no one", async (_label, query) => {
    const res = await visit(query);
    expectRedirect(res, notice("failed"));
    expect(verifyTransaction).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
    expectUnpaid();
  });

  it("shows 'failed' for an order that doesn't exist, without asking Paystack", async () => {
    const res = await visit("?reference=cmsomeoneelse000000000001");
    expectRedirect(res, notice("failed"));
    expect(verifyTransaction).not.toHaveBeenCalled();
    expectUnpaid();
  });

  it.each(["stripe", "demo", null])(
    "shows 'failed' for an order paid through %s, without asking Paystack",
    async (provider) => {
      order!.paymentProvider = provider;
      const res = await visit(`?reference=${ORDER_ID}`);
      expectRedirect(res, notice("failed"));
      expect(verifyTransaction).not.toHaveBeenCalled();
      expectUnpaid();
    },
  );
});

describe("GET /api/paystack/callback — redirects only ever go to our own site", () => {
  it("ignores redirect parameters someone adds to the URL", async () => {
    const hostile =
      `?reference=${ORDER_ID}&callbackUrl=https%3A%2F%2Fevil.test` +
      "&next=%2F%2Fevil.test&redirect=https%3A%2F%2Fevil.test&returnTo=%2F%2Fevil.test";
    expectRedirect(await visit(hostile), SUCCESS);
  });

  it("ignores the host the request arrived on", async () => {
    expectRedirect(await visit(`?reference=${ORDER_ID}`, "https://evil.test"), SUCCESS);
  });

  it("builds every outcome on NEXTAUTH_URL", async () => {
    const outcomes: Array<() => void> = [
      () => verifyTransaction.mockResolvedValue(paidTx()),
      () => verifyTransaction.mockResolvedValue(paidTx({ status: "abandoned" })),
      () => verifyTransaction.mockResolvedValue(paidTx({ status: "failed" })),
      () => verifyTransaction.mockResolvedValue(paidTx({ status: "ongoing" })),
      () => verifyTransaction.mockRejectedValue(new Error("x")),
    ];
    for (const arrange of outcomes) {
      order!.status = "pending";
      arrange();
      const res = await visit(`?reference=${ORDER_ID}&callbackUrl=https%3A%2F%2Fevil.test`);
      const location = res.headers.get("location")!;
      expect(location.startsWith(`${ORIGIN}/`), location).toBe(true);
      expect(location).not.toContain("evil");
    }
  });
});

describe("GET /api/paystack/callback — logging", () => {
  it("logs ids and verdicts only — never the key or the customer's email", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_never_logged");
    verifyTransaction.mockResolvedValue(paidTx({ amount: 1 }));
    await visit(`?reference=${ORDER_ID}`);
    verifyTransaction.mockRejectedValue(new Error("paystack_500"));
    await visit(`?reference=${ORDER_ID}`);
    const logged = JSON.stringify(errorLog.mock.calls);
    expect(logged).toContain(ORDER_ID);
    expect(logged).not.toContain("sk_test_never_logged");
    expect(logged).not.toContain("@");
  });
});
