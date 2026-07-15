import { describe, expect, it } from "vitest";
import {
  hasItem,
  addItem,
  removeItem,
  toggleItem,
  type WishlistItem,
} from "@/lib/wishlist";

const ITEM: WishlistItem = {
  slug: "sepia-field-jacket",
  name: "Sepia Field Jacket",
  price: 24000,
  image: "/images/sepia-field-jacket-1.svg",
};

const OTHER: WishlistItem = {
  slug: "ink-wool-coat",
  name: "Ink Wool Coat",
  price: 38000,
  image: "/images/ink-wool-coat-1.svg",
};

describe("hasItem", () => {
  it("returns true when a matching slug is present", () => {
    expect(hasItem([ITEM], ITEM.slug)).toBe(true);
  });

  it("returns false when the slug is absent", () => {
    expect(hasItem([OTHER], ITEM.slug)).toBe(false);
    expect(hasItem([], ITEM.slug)).toBe(false);
  });
});

describe("addItem", () => {
  it("appends a new item", () => {
    const result = addItem([], ITEM);
    expect(result).toEqual([ITEM]);
  });

  it("is idempotent — adding an already-present slug does not duplicate", () => {
    const once = addItem([], ITEM);
    const twice = addItem(once, ITEM);
    expect(twice).toEqual([ITEM]);
    expect(twice.length).toBe(1);
  });

  it("does not mutate the input array", () => {
    const input: WishlistItem[] = [];
    addItem(input, ITEM);
    expect(input).toEqual([]);
  });
});

describe("removeItem", () => {
  it("removes the matching slug", () => {
    const result = removeItem([ITEM, OTHER], ITEM.slug);
    expect(result).toEqual([OTHER]);
  });

  it("is a safe no-op when the slug is absent", () => {
    const input = [OTHER];
    const result = removeItem(input, ITEM.slug);
    expect(result).toEqual([OTHER]);
  });

  it("does not mutate the input array", () => {
    const input = [ITEM, OTHER];
    removeItem(input, ITEM.slug);
    expect(input).toEqual([ITEM, OTHER]);
  });
});

describe("toggleItem", () => {
  it("adds the item when absent", () => {
    const result = toggleItem([], ITEM);
    expect(result).toEqual([ITEM]);
  });

  it("removes the item when present", () => {
    const result = toggleItem([ITEM], ITEM);
    expect(result).toEqual([]);
  });

  it("add-then-toggle returns to an empty list", () => {
    const added = toggleItem([], ITEM);
    const toggledBack = toggleItem(added, ITEM);
    expect(toggledBack).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const input: WishlistItem[] = [ITEM];
    toggleItem(input, ITEM);
    expect(input).toEqual([ITEM]);
  });
});

describe("serialization round-trip", () => {
  it("preserves shape through JSON.parse(JSON.stringify(items))", () => {
    const items = [ITEM, OTHER];
    const roundTripped = JSON.parse(JSON.stringify(items)) as WishlistItem[];
    expect(roundTripped).toEqual(items);
  });
});
