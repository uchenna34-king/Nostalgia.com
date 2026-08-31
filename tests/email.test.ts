import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  orderReference,
  formatCents,
  buildOrderConfirmationContent,
  type OrderEmailSource,
} from "@/lib/email-content";
import { ORDER_STATUSES } from "@/lib/orders";

const baseOrder: OrderEmailSource = {
  id: "clx0000000abcdefgh",
  email: "customer@example.com",
  items: JSON.stringify([
    { slug: "sepia-wool-overcoat", name: "Sepia Wool Overcoat", size: "M", unitPrice: 28500, qty: 1 },
    { slug: "cream-linen-shirt", name: "Cream Linen Shirt", size: "L", unitPrice: 9500, qty: 2 },
  ]),
  total: 47500,
  status: "paid",
  createdAt: new Date("2026-08-01T10:00:00Z"),
};

describe("orderReference", () => {
  it("returns the # prefix plus the final eight characters", () => {
    expect(orderReference("clx0000000abcdefgh")).toBe("#abcdefgh");
  });
});

describe("formatCents", () => {
  it("formats cents to a no-cents dollar string", () => {
    expect(formatCents(4200)).toBe("$42");
  });

  it("formats zero cents", () => {
    expect(formatCents(0)).toBe("$0");
  });
});

describe("buildOrderConfirmationContent", () => {
  it("includes the order reference in the subject", () => {
    const content = buildOrderConfirmationContent(baseOrder);
    expect(content.subject).toContain(orderReference(baseOrder.id));
  });

  it("returns a non-empty preheader that contains the order reference", () => {
    const content = buildOrderConfirmationContent(baseOrder);
    expect(content.preheader.length).toBeGreaterThan(0);
    expect(content.preheader).toContain(orderReference(baseOrder.id));
  });

  it("has one line entry per parsed item, each with lineTotal === unitPrice * qty", () => {
    const content = buildOrderConfirmationContent(baseOrder);
    expect(content.lines).toHaveLength(2);
    for (const line of content.lines) {
      expect(line.lineTotal).toBe(line.unitPrice * line.qty);
    }
    expect(content.lines[1].lineTotal).toBe(9500 * 2);
  });

  it("sets formattedTotal from the order's stored cents total, not a re-sum of line items", () => {
    // Deliberately mismatched total vs line-item sum to prove the DB total wins.
    const skewedOrder: OrderEmailSource = { ...baseOrder, total: 99999 };
    const content = buildOrderConfirmationContent(skewedOrder);
    expect(content.formattedTotal).toBe(formatCents(99999));
    expect(content.total).toBe(99999);
  });

  it("degrades to an empty lines array (and still returns a valid subject/total) on corrupt items JSON", () => {
    const corrupt: OrderEmailSource = { ...baseOrder, items: "not json" };
    const content = buildOrderConfirmationContent(corrupt);
    expect(content.lines).toEqual([]);
    expect(content.subject.length).toBeGreaterThan(0);
    expect(content.formattedTotal).toBe(formatCents(corrupt.total));
  });

  it("maps each ORDER_STATUSES value to its label and color", () => {
    const expected: Record<string, { label: string; color: string }> = {
      pending: { label: "Pending", color: "#3A3A3A" },
      paid: { label: "Paid", color: "#8A4524" },
      fulfilled: { label: "Fulfilled", color: "#1A1A1A" },
      cancelled: { label: "Cancelled", color: "#9B2C2C" },
    };
    for (const status of ORDER_STATUSES) {
      const content = buildOrderConfirmationContent({ ...baseOrder, status });
      expect(content.statusLabel).toBe(expected[status].label);
      expect(content.statusColor).toBe(expected[status].color);
    }
  });

  it("sets orderUrl from a supplied base URL", () => {
    const content = buildOrderConfirmationContent(baseOrder, "https://x.vercel.app");
    expect(content.orderUrl).toBe(`https://x.vercel.app/account/orders/${baseOrder.id}`);
  });

  it("never substitutes a default origin when no base URL is supplied", () => {
    const content = buildOrderConfirmationContent(baseOrder);
    expect(content.orderUrl).toBeNull();
  });

  it("never substitutes a default origin when base URL is explicitly null", () => {
    const content = buildOrderConfirmationContent(baseOrder, null);
    expect(content.orderUrl).toBeNull();
  });
});

// --- sendOrderConfirmation (Task 3) ---------------------------------------
//
// lib/email.ts reads process.env.RESEND_API_KEY at module-load time (mirrors
// lib/stripe.ts's null-if-no-key idiom), so every test that needs a specific
// key/unset state must vi.resetModules() and re-import fresh, matching the
// established pattern in tests/checkout-shipping.test.ts.

const orderRow = {
  id: "clx0000000abcdefgh",
  email: "customer@example.com",
  items: JSON.stringify([
    {
      slug: "sepia-wool-overcoat",
      name: "Sepia Wool Overcoat",
      size: "M",
      unitPrice: 28500,
      qty: 1,
    },
  ]),
  total: 28500,
  status: "paid",
  createdAt: new Date("2026-08-01T10:00:00Z"),
};

const findUnique = vi.fn();
const send = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: { order: { findUnique: (...a: unknown[]) => findUnique(...a) } },
}));

vi.mock("resend", () => ({
  // A plain function (not an arrow function) so `new Resend(key)` works —
  // arrow functions are not constructible.
  Resend: vi.fn().mockImplementation(function MockResend() {
    return { emails: { send: (...a: unknown[]) => send(...a) } };
  }),
}));

describe("sendOrderConfirmation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    findUnique.mockResolvedValue(orderRow);
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.NEXTAUTH_URL;
  });

  it("resolves without throwing and never calls send when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    const { sendOrderConfirmation } = await import("@/lib/email");
    await expect(sendOrderConfirmation("clx0000000abcdefgh")).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it("sends exactly once when the key is set and the order is found", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Nostalgia <onboarding@resend.dev>";
    const { sendOrderConfirmation } = await import("@/lib/email");
    await sendOrderConfirmation("clx0000000abcdefgh");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("addresses only the email column of the looked-up order row", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Nostalgia <onboarding@resend.dev>";
    const { sendOrderConfirmation } = await import("@/lib/email");
    await sendOrderConfirmation("clx0000000abcdefgh");
    expect(send.mock.calls[0][0].to).toBe(orderRow.email);
  });

  it("uses EMAIL_FROM as the from address", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Nostalgia <onboarding@resend.dev>";
    const { sendOrderConfirmation } = await import("@/lib/email");
    await sendOrderConfirmation("clx0000000abcdefgh");
    expect(send.mock.calls[0][0].from).toBe(process.env.EMAIL_FROM);
  });

  it("carries both a React element and a non-empty plain-text alternative", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Nostalgia <onboarding@resend.dev>";
    const { sendOrderConfirmation } = await import("@/lib/email");
    await sendOrderConfirmation("clx0000000abcdefgh");
    const call = send.mock.calls[0][0];
    expect(call.react).toBeTruthy();
    expect(typeof call.text).toBe("string");
    expect(call.text.length).toBeGreaterThan(0);
  });

  it("uses the same subject buildOrderConfirmationContent produces for this order", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Nostalgia <onboarding@resend.dev>";
    const { sendOrderConfirmation } = await import("@/lib/email");
    await sendOrderConfirmation("clx0000000abcdefgh");
    const expected = buildOrderConfirmationContent(orderRow).subject;
    expect(send.mock.calls[0][0].subject).toBe(expected);
  });

  it("resolves without throwing and sends nothing when the order id is unknown", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Nostalgia <onboarding@resend.dev>";
    findUnique.mockResolvedValue(null);
    const { sendOrderConfirmation } = await import("@/lib/email");
    await expect(sendOrderConfirmation("missing")).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it("swallows a rejected send (network throw) and logs via console.error", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Nostalgia <onboarding@resend.dev>";
    send.mockRejectedValue(new Error("network down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendOrderConfirmation } = await import("@/lib/email");
    await expect(sendOrderConfirmation("clx0000000abcdefgh")).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("swallows a returned { error } payload and logs via console.error", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Nostalgia <onboarding@resend.dev>";
    send.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "bad from address" },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendOrderConfirmation } = await import("@/lib/email");
    await expect(sendOrderConfirmation("clx0000000abcdefgh")).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("has an arity of exactly 1 — accepts only an order id (T-11-04-01)", async () => {
    const { sendOrderConfirmation } = await import("@/lib/email");
    expect(sendOrderConfirmation.length).toBe(1);
  });

  it("exports exactly one send function from lib/email.ts (D-06)", async () => {
    const mod = await import("@/lib/email");
    const fnExports = Object.keys(mod).filter(
      (k) => typeof (mod as unknown as Record<string, unknown>)[k] === "function",
    );
    expect(fnExports).toEqual(["sendOrderConfirmation"]);
  });
});
