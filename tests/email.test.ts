import { createElement } from "react";
import { render } from "react-email";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  orderReference,
  buildOrderConfirmationContent,
  type OrderEmailSource,
} from "@/lib/email-content";
import { formatMoney } from "@/lib/currency";
import { ORDER_STATUSES } from "@/lib/orders";
import OrderConfirmationEmail from "@/emails/OrderConfirmation";

const baseOrder: OrderEmailSource = {
  id: "clx0000000abcdefgh",
  email: "customer@example.com",
  items: JSON.stringify([
    { slug: "sepia-wool-overcoat", name: "Sepia Wool Overcoat", size: "M", unitPrice: 28500, qty: 1 },
    { slug: "cream-linen-shirt", name: "Cream Linen Shirt", size: "L", unitPrice: 9500, qty: 2 },
  ]),
  total: 47500,
  currency: "USD",
  shippingAddress: null,
  status: "paid",
  createdAt: new Date("2026-08-01T10:00:00Z"),
};

const LAGOS = {
  fullName: "Ada Obi",
  phone: "+234 803 123 4567",
  line1: "12 Admiralty Way",
  line2: "Flat 3",
  city: "Lekki",
  region: "Lagos",
  postalCode: "106104",
  country: "NG",
};

// A naira order: two lines (₦45,000 + 2 x ₦25,000) and a ₦5,000 delivery fee.
const nairaOrder: OrderEmailSource = {
  ...baseOrder,
  items: JSON.stringify([
    { slug: "coat", name: "Coat", size: "M", unitPrice: 4_500_000, qty: 1 },
    { slug: "tee", name: "Tee", size: "S", unitPrice: 2_500_000, qty: 2 },
  ]),
  total: 10_000_000,
  currency: "NGN",
  shippingAddress: JSON.stringify(LAGOS),
};

describe("orderReference", () => {
  it("returns the # prefix plus the final eight characters", () => {
    expect(orderReference("clx0000000abcdefgh")).toBe("#abcdefgh");
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
    expect(content.formattedTotal).toBe(formatMoney(99999, "USD"));
    expect(content.total).toBe(99999);
  });

  it("degrades to an empty lines array (and still returns a valid subject/total) on corrupt items JSON", () => {
    const corrupt: OrderEmailSource = { ...baseOrder, items: "not json" };
    const content = buildOrderConfirmationContent(corrupt);
    expect(content.lines).toEqual([]);
    expect(content.subject.length).toBeGreaterThan(0);
    expect(content.formattedTotal).toBe(formatMoney(corrupt.total, "USD"));
  });

  it("maps each ORDER_STATUSES value to its label and color", () => {
    // Black-and-white palette: states are told apart by weight of grey,
    // and only `cancelled` keeps a functional red (lib/email-content.ts).
    const expected: Record<string, { label: string; color: string }> = {
      pending: { label: "Pending", color: "#595959" },
      paid: { label: "Paid", color: "#000000" },
      fulfilled: { label: "Fulfilled", color: "#000000" },
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

describe("buildOrderConfirmationContent in the order's currency (D-26)", () => {
  it("formats a naira order's lines, shipping and total in naira", () => {
    const content = buildOrderConfirmationContent(nairaOrder);
    expect(content.lines.map((l) => l.formattedLineTotal)).toEqual(["₦45,000", "₦50,000"]);
    expect(content.lines[1].formattedUnitPrice).toBe("₦25,000");
    expect(content.formattedShipping).toBe("₦5,000");
    expect(content.formattedTotal).toBe("₦100,000");
  });

  it("keeps a legacy dollar order in dollars, with free shipping when the lines make the total", () => {
    const content = buildOrderConfirmationContent(baseOrder);
    expect(content.lines.map((l) => l.formattedLineTotal)).toEqual(["$285", "$190"]);
    expect(content.formattedShipping).toBe("Free");
    expect(content.formattedTotal).toBe("$475");
  });

  it("derives the shipping fee as the stored total minus the lines", () => {
    const content = buildOrderConfirmationContent({ ...baseOrder, total: 52_500 });
    expect(content.formattedShipping).toBe("$50");
  });

  it("falls back to dollars for an unrecognised currency rather than mislabelling", () => {
    const content = buildOrderConfirmationContent({ ...baseOrder, currency: "EUR" });
    expect(content.formattedTotal).toBe("$475");
  });

  it("lists the delivery address, one line per part, with the country by name", () => {
    expect(buildOrderConfirmationContent(nairaOrder).addressLines).toEqual([
      "Ada Obi",
      "12 Admiralty Way",
      "Flat 3",
      "Lekki, Lagos 106104",
      "Nigeria",
      "+234 803 123 4567",
    ]);
  });

  it("has no address block for a legacy order or a corrupt snapshot", () => {
    expect(buildOrderConfirmationContent(baseOrder).addressLines).toBeNull();
    expect(
      buildOrderConfirmationContent({ ...baseOrder, shippingAddress: "not json" }).addressLines,
    ).toBeNull();
  });
});

describe("OrderConfirmationEmail", () => {
  const html = (order: OrderEmailSource) =>
    render(createElement(OrderConfirmationEmail, { content: buildOrderConfirmationContent(order) }));

  it("declares UTF-8 so the naira sign survives every mail client", async () => {
    const out = await html(nairaOrder);
    expect(out.toLowerCase()).toMatch(/charset=["']?utf-8/);
    expect(out).toContain("₦100,000");
  });

  it("shows the shipping row and the delivery address", async () => {
    const out = await html(nairaOrder);
    expect(out).toContain("Shipping");
    expect(out).toContain("₦5,000");
    expect(out).toContain("Delivering to");
    expect(out).toContain("12 Admiralty Way");
    expect(out).toContain("Lekki, Lagos 106104");
  });

  it("omits the address block for a legacy order", async () => {
    const out = await html(baseOrder);
    expect(out).not.toContain("Delivering to");
    expect(out).toContain("Free");
  });

  it("keeps long naira amounts on one line", async () => {
    const out = await html(nairaOrder);
    expect(out).toMatch(/width:\s*96px/);
    expect(out).toMatch(/white-space:\s*nowrap/);
  });

  it("escapes address text instead of injecting it as HTML", async () => {
    const out = await html({
      ...nairaOrder,
      shippingAddress: JSON.stringify({ ...LAGOS, line1: "<img src=x onerror=alert(1)>" }),
    });
    expect(out).not.toContain("<img src=x");
    expect(out).toContain("&lt;img src=x");
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
  currency: "USD",
  shippingAddress: null,
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
