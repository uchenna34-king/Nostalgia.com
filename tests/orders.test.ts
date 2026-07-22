import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  isValidOrderStatus,
  parseOrderItems,
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
