import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  isPaymentProvider,
  isValidOrderStatus,
  orderCurrency,
  orderShippingMinor,
  parseOrderItems,
  parseShippingAddress,
  paymentProviderLabel,
} from "@/lib/orders";

describe("ORDER_STATUSES", () => {
  it("is the four fulfillment statuses in pipeline order", () => {
    expect(ORDER_STATUSES).toEqual([
      "pending",
      "paid",
      "fulfilled",
      "cancelled",
    ]);
  });
});

describe("isValidOrderStatus", () => {
  it("accepts each allow-listed status", () => {
    for (const s of ORDER_STATUSES) {
      expect(isValidOrderStatus(s)).toBe(true);
    }
  });

  it("rejects out-of-set / wrong-case / empty values", () => {
    expect(isValidOrderStatus("shipped")).toBe(false);
    expect(isValidOrderStatus("PENDING")).toBe(false);
    expect(isValidOrderStatus("")).toBe(false);
    expect(isValidOrderStatus("delete")).toBe(false);
  });
});

describe("parseOrderItems", () => {
  it("parses a valid Order.items JSON snapshot", () => {
    const json = JSON.stringify([
      { slug: "a", name: "A", size: "M", unitPrice: 1000, qty: 2 },
    ]);
    const items = parseOrderItems(json);
    expect(items).toHaveLength(1);
    expect(items[0].size).toBe("M");
    expect(items[0].qty).toBe(2);
  });

  it("returns [] on malformed / non-array input", () => {
    expect(parseOrderItems("not json")).toEqual([]);
    expect(parseOrderItems("{}")).toEqual([]);
    expect(parseOrderItems("")).toEqual([]);
  });
});

describe("payment providers", () => {
  it("allow-lists paystack, stripe and demo with readable labels", () => {
    expect(isPaymentProvider("paystack")).toBe(true);
    expect(isPaymentProvider("demo")).toBe(true);
    expect(isPaymentProvider("Paystack")).toBe(false);
    expect(paymentProviderLabel("stripe")).toBe("Stripe");
    expect(paymentProviderLabel("demo")).toBe("Demo (no real payment)");
    expect(paymentProviderLabel(null)).toBe("—");
  });
});

describe("orderCurrency", () => {
  it("reads the stored currency and falls back to USD for legacy or odd values", () => {
    expect(orderCurrency({ currency: "NGN" })).toBe("NGN");
    expect(orderCurrency({ currency: "USD" })).toBe("USD");
    expect(orderCurrency({ currency: null })).toBe("USD");
    expect(orderCurrency({})).toBe("USD");
    expect(orderCurrency({ currency: "EUR" })).toBe("USD");
  });
});

describe("parseShippingAddress", () => {
  const addr = { fullName: "Ada Obi", phone: "0803", line1: "12 Way", city: "Lekki", region: "Lagos", country: "NG" };
  it("parses a stored snapshot", () => {
    expect(parseShippingAddress(JSON.stringify(addr))).toEqual(addr);
    expect(parseShippingAddress(JSON.stringify({ ...addr, line2: "Flat 3" }))?.line2).toBe("Flat 3");
  });
  it("returns null for legacy, corrupt or incomplete rows", () => {
    expect(parseShippingAddress(null)).toBeNull();
    expect(parseShippingAddress("")).toBeNull();
    expect(parseShippingAddress("not json")).toBeNull();
    expect(parseShippingAddress("[]")).toBeNull();
    expect(parseShippingAddress(JSON.stringify({ ...addr, line1: "" }))).toBeNull();
  });
});

describe("orderShippingMinor", () => {
  const items = JSON.stringify([
    { slug: "a", name: "A", size: "M", unitPrice: 1000, qty: 2 },
    { slug: "b", name: "B", size: "L", unitPrice: 500, qty: 1 },
  ]);
  it("is the total minus the line items, never negative", () => {
    expect(orderShippingMinor({ total: 4000, items })).toBe(1500);
    expect(orderShippingMinor({ total: 2500, items })).toBe(0);
    expect(orderShippingMinor({ total: 100, items })).toBe(0);
    expect(orderShippingMinor({ total: 900, items: "corrupt" })).toBe(900);
  });
});
