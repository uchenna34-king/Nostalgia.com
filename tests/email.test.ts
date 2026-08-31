import { describe, expect, it } from "vitest";
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
