import { beforeEach, describe, expect, it, vi } from "vitest";

// createProduct must only file a product somewhere the shop tree can show it:
// the storefront routes render lib/taxonomy.ts places and nothing else, so a
// typo'd category or a section from the wrong category would hide the piece.
const create = vi.fn();
const findRate = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin", () => ({ requireOwner: vi.fn(async () => undefined) }));
vi.mock("@/lib/db", () => ({
  prisma: {
    product: { create: (...a: unknown[]) => create(...a) },
    storeSettings: { findUnique: (...a: unknown[]) => findRate(...a) },
  },
}));

import { createProduct } from "@/app/admin/products/actions";

function form(overrides: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    name: "Tempo Road Runner",
    slug: "tempo-road-runner",
    priceNgn: "18000",
    category: "Shoes",
    department: "men",
    subcategory: "running",
    description: "A daily trainer.",
    variants: JSON.stringify([{ size: "UK 8", stock: 3 }]),
    images: "[]",
    collectionIds: "[]",
    ...overrides,
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const saved = () => create.mock.calls[0][0].data;

beforeEach(() => {
  create.mockReset();
  findRate.mockReset();
  findRate.mockResolvedValue({ id: 1, usdNgnRate: 1500 });
});

describe("createProduct placement", () => {
  it("saves a valid department / category / section", async () => {
    expect(await createProduct(form())).toEqual({ ok: true });
    expect(saved()).toMatchObject({
      category: "Shoes",
      department: "men",
      subcategory: "running",
    });
  });

  it("canonicalises the category label and defaults to unisex, whole category", async () => {
    expect(
      await createProduct(form({ category: " shirts & t-shirts ", department: "", subcategory: "" })),
    ).toEqual({ ok: true });
    expect(saved()).toMatchObject({
      category: "Shirts & T-shirts",
      department: "unisex",
      subcategory: null,
    });
  });

  it.each([
    ["an unknown category", { category: "Hats" }],
    ["an unknown department", { department: "kids" }],
    ["a section from another category", { subcategory: "denim" }],
    ["a section on a category without sections", { category: "Outerwear", subcategory: "running" }],
  ])("rejects %s without writing", async (_label, overrides) => {
    expect(await createProduct(form(overrides))).toEqual({
      ok: false,
      error: "invalid_product_input",
    });
    expect(create).not.toHaveBeenCalled();
  });
});

// Prices are typed in whole naira / dollars (D-07) and stored in kobo / cents.
// The dollar price the storefront charges is always computed here, from the
// override or the store rate, never taken from the browser (D-03, D-04).
describe("createProduct pricing", () => {
  it("stores the naira price and prices dollars from the store rate when $ is blank", async () => {
    expect(await createProduct(form({ priceNgn: "45000" }))).toEqual({ ok: true });
    expect(saved()).toMatchObject({
      priceNgn: 4_500_000,
      priceUsdOverride: null,
      priceUsd: 3_000, // ₦45,000 ÷ 1,500 = $30 exactly
    });
  });

  it("rounds an auto dollar price up to the next whole dollar", async () => {
    findRate.mockResolvedValue({ id: 1, usdNgnRate: 1600 });
    expect(await createProduct(form({ priceNgn: "45000" }))).toEqual({ ok: true });
    expect(saved().priceUsd).toBe(2_900); // 28.125 -> $29
  });

  it("keeps a hand-set dollar price as both the override and the effective price", async () => {
    expect(await createProduct(form({ priceNgn: "45000", priceUsd: "35" }))).toEqual({ ok: true });
    expect(saved()).toMatchObject({
      priceNgn: 4_500_000,
      priceUsdOverride: 3_500,
      priceUsd: 3_500,
    });
  });

  it("ignores any effective price or legacy price the browser posts", async () => {
    const fd = form({ priceNgn: "45000" });
    fd.set("price", "1");
    fd.set("priceUsdOverride", "1");
    expect(await createProduct(fd)).toEqual({ ok: true });
    expect(saved()).toMatchObject({ priceUsd: 3_000, priceUsdOverride: null });
    expect(saved()).not.toHaveProperty("price");
  });

  it.each(["", "abc", "-1", "45000.5", "45,000", "1e5", "21474837"])(
    "rejects naira price %j without writing",
    async (priceNgn) => {
      expect(await createProduct(form({ priceNgn }))).toEqual({
        ok: false,
        error: "invalid_price_ngn",
      });
      expect(create).not.toHaveBeenCalled();
    },
  );

  it.each(["abc", "-5", "3.5", "21474837"])(
    "rejects dollar price %j without writing",
    async (priceUsd) => {
      expect(await createProduct(form({ priceNgn: "45000", priceUsd }))).toEqual({
        ok: false,
        error: "invalid_price_usd",
      });
      expect(create).not.toHaveBeenCalled();
    },
  );

  it("refuses to save when the store rate isn't set", async () => {
    findRate.mockResolvedValue(null);
    expect(await createProduct(form({ priceNgn: "45000" }))).toEqual({
      ok: false,
      error: "rate_unavailable",
    });
    expect(create).not.toHaveBeenCalled();
  });
});
