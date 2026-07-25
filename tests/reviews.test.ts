import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    order: { findMany: vi.fn() },
    review: { groupBy: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { getRatingSummaries, hasPurchased, isValidRating } from "@/lib/reviews";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isValidRating", () => {
  it("accepts each integer 1 through 5", () => {
    for (const value of [1, 2, 3, 4, 5]) {
      expect(isValidRating(value)).toBe(true);
    }
  });

  it("rejects out-of-range, non-integer, and NaN values", () => {
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating(-1)).toBe(false);
    expect(isValidRating(2.5)).toBe(false);
    expect(isValidRating(NaN)).toBe(false);
  });
});

describe("hasPurchased (verified-purchase slug match)", () => {
  it("returns true when a resolved order's parsed items contain the slug", async () => {
    (prisma.order.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        items: JSON.stringify([
          { slug: "jacket-01", name: "Jacket", size: "M", unitPrice: 12000, qty: 1 },
        ]),
      },
    ]);

    await expect(hasPurchased("user-1", "jacket-01")).resolves.toBe(true);
  });

  it("returns false when no resolved order's items contain the slug", async () => {
    (prisma.order.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        items: JSON.stringify([
          { slug: "scarf-02", name: "Scarf", size: "OS", unitPrice: 4000, qty: 1 },
        ]),
      },
    ]);

    await expect(hasPurchased("user-1", "jacket-01")).resolves.toBe(false);
  });

  it("returns false when findMany resolves to an empty array", async () => {
    (prisma.order.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(hasPurchased("user-1", "jacket-01")).resolves.toBe(false);
  });
});

describe("getRatingSummaries rating-merge zero-default", () => {
  it("returns a Map covering every requested id, defaulting reviewless ids to zero", async () => {
    (prisma.review.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { productId: "p1", _avg: { rating: 4.5 }, _count: { rating: 2 } },
    ]);

    const summaries = await getRatingSummaries(["p1", "p2"]);

    expect(summaries.get("p1")).toEqual({ avg: 4.5, count: 2 });
    expect(summaries.get("p2")).toEqual({ avg: 0, count: 0 });
  });

  it("resolves to an empty Map for empty input", async () => {
    await expect(getRatingSummaries([])).resolves.toEqual(new Map());
  });
});
