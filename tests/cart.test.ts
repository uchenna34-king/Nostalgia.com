import { describe, expect, it } from "vitest";
import {
  applyPriceUpdates,
  isValidCartItem,
  lineTotal,
  normaliseCartItems,
  subtotalsOf,
  type CartItem,
} from "@/lib/cart";

const coat: CartItem = {
  slug: "coat",
  name: "Nostalgia Coat",
  prices: { NGN: 39_000_000, USD: 26_000 },
  image: "https://example.test/coat.jpg",
  size: "M",
  qty: 1,
};
const tee: CartItem = {
  slug: "tee",
  name: "Crest Tee",
  prices: { NGN: 4_500_000, USD: 3_000 },
  image: "",
  size: "S",
  qty: 2,
};

describe("isValidCartItem", () => {
  it("accepts an item that carries both prices", () => {
    expect(isValidCartItem(coat)).toBe(true);
  });

  it.each([
    ["a legacy single-price entry", { ...coat, prices: undefined, price: 26_000 }],
    ["a missing currency", { ...coat, prices: { USD: 26_000 } }],
    ["a fractional price", { ...coat, prices: { NGN: 1.5, USD: 26_000 } }],
    ["a negative price", { ...coat, prices: { NGN: -1, USD: 26_000 } }],
    ["a string price", { ...coat, prices: { NGN: "39000000", USD: 26_000 } }],
    ["a zero quantity", { ...coat, qty: 0 }],
    ["a fractional quantity", { ...coat, qty: 1.5 }],
    ["an empty slug", { ...coat, slug: "" }],
    ["a missing size", { ...coat, size: undefined }],
    ["a non-object", "coat"],
    ["null", null],
  ])("rejects %s", (_label, value) => {
    expect(isValidCartItem(value)).toBe(false);
  });
});

describe("normaliseCartItems", () => {
  it("keeps valid items and discards legacy or broken ones (D-13)", () => {
    const legacy = { slug: "old", name: "Old", price: 4_500, image: "", size: "M", qty: 1 };
    expect(normaliseCartItems([coat, legacy, { junk: true }, tee])).toEqual([coat, tee]);
  });

  it("drops unknown fields and fills a missing image with an empty string", () => {
    const { image: _image, ...noImage } = coat;
    const [item] = normaliseCartItems([{ ...noImage, extra: "x", price: 1 }]);
    expect(item).toEqual({ ...coat, image: "" });
    expect(item).not.toHaveProperty("extra");
    expect(item).not.toHaveProperty("price");
  });

  it("returns an empty bag for anything that isn't a list", () => {
    expect(normaliseCartItems(null)).toEqual([]);
    expect(normaliseCartItems({ items: [coat] })).toEqual([]);
    expect(normaliseCartItems("[]")).toEqual([]);
  });
});

describe("subtotalsOf", () => {
  it("sums every line in each currency separately", () => {
    expect(subtotalsOf([coat, tee])).toEqual({
      NGN: 39_000_000 + 2 * 4_500_000,
      USD: 26_000 + 2 * 3_000,
    });
  });

  it("is zero in both currencies for an empty bag", () => {
    expect(subtotalsOf([])).toEqual({ NGN: 0, USD: 0 });
  });
});

describe("applyPriceUpdates", () => {
  it("replaces the snapshot for every size of a re-priced product", () => {
    const coatL = { ...coat, size: "L" };
    const updated = applyPriceUpdates([coat, coatL, tee], [
      { slug: "coat", NGN: 40_000_000, USD: 27_000 },
    ]);
    expect(updated.map((i) => i.prices)).toEqual([
      { NGN: 40_000_000, USD: 27_000 },
      { NGN: 40_000_000, USD: 27_000 },
      tee.prices,
    ]);
  });

  it("ignores updates that aren't valid prices", () => {
    const updated = applyPriceUpdates([coat], [
      { slug: "coat", NGN: -5, USD: 27_000 },
      { slug: "coat", NGN: 1.5, USD: 27_000 },
    ]);
    expect(updated[0].prices).toEqual(coat.prices);
  });
});

describe("lineTotal", () => {
  it("is the piece price times the quantity, in both currencies", () => {
    expect(lineTotal(tee)).toEqual({ NGN: 9_000_000, USD: 6_000 });
  });
});
