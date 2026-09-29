import { beforeEach, describe, expect, it, vi } from "vitest";

// createProduct must only file a product somewhere the shop tree can show it:
// the storefront routes render lib/taxonomy.ts places and nothing else, so a
// typo'd category or a section from the wrong category would hide the piece.
const create = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin", () => ({ requireOwner: vi.fn(async () => undefined) }));
vi.mock("@/lib/db", () => ({
  prisma: { product: { create: (...a: unknown[]) => create(...a) } },
}));

import { createProduct } from "@/app/admin/products/actions";

function form(overrides: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    name: "Tempo Road Runner",
    slug: "tempo-road-runner",
    price: "18000",
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

beforeEach(() => create.mockReset());

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
