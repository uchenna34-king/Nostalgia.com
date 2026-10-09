import { beforeEach, describe, expect, it, vi } from "vitest";
import { slugParam, toSlug } from "@/lib/slug";

const create = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin", () => ({ requireOwner: vi.fn(async () => undefined) }));
vi.mock("@/lib/db", () => ({
  prisma: {
    product: { create: (...a: unknown[]) => create(...a) },
    collection: { create: (...a: unknown[]) => create(...a) },
  },
}));

import { createProduct } from "@/app/admin/products/actions";
import { createCollection } from "@/app/admin/collections/actions";

beforeEach(() => create.mockReset());

describe("toSlug", () => {
  it("turns what the owner types into a URL-safe slug", () => {
    expect(toSlug("orange cotton sweatshirt")).toBe("orange-cotton-sweatshirt");
    expect(toSlug("  Orange Cotton  Sweatshirt ")).toBe("orange-cotton-sweatshirt");
    expect(toSlug("Café Crème / Wool-Blend!")).toBe("cafe-creme-wool-blend");
    expect(toSlug("already-a-slug")).toBe("already-a-slug");
  });

  it("caps the length without leaving a trailing hyphen", () => {
    const slug = toSlug(`${"a".repeat(79)} b`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("gives an empty string when nothing usable is left", () => {
    expect(toSlug("  !!! ")).toBe("");
  });
});

describe("slugParam", () => {
  it("decodes the percent-encoded route param", () => {
    expect(slugParam("orange%20cotton%20sweatshirt")).toBe(
      "orange cotton sweatshirt",
    );
    expect(slugParam("atelier-crest-tee")).toBe("atelier-crest-tee");
  });

  it("returns a malformed param unchanged instead of throwing", () => {
    expect(slugParam("bad%E0%A4%A")).toBe("bad%E0%A4%A");
  });
});

function productForm(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({
    name: "Orange Cotton Sweatshirt",
    slug: "orange cotton sweatshirt",
    price: "12000",
    category: "Sweatshirts",
    department: "unisex",
    subcategory: "",
    description: "Heavy loopback cotton.",
    variants: "[]",
    images: "[]",
    collectionIds: "[]",
    ...fields,
  }))
    fd.set(k, v);
  return fd;
}

describe("admin saves", () => {
  it("stores a product slug typed with spaces as a URL-safe slug", async () => {
    expect(await createProduct(productForm({}))).toEqual({ ok: true });
    expect(create.mock.calls[0][0].data.slug).toBe("orange-cotton-sweatshirt");
  });

  it("falls back to the name when the slug is left blank", async () => {
    expect(await createProduct(productForm({ slug: "" }))).toEqual({ ok: true });
    expect(create.mock.calls[0][0].data.slug).toBe("orange-cotton-sweatshirt");
  });

  it("normalises collection slugs the same way", async () => {
    const fd = new FormData();
    fd.set("name", "Autumn Archive");
    fd.set("slug", "Autumn Archive 2026");
    fd.set("productIds", "[]");
    expect(await createCollection(fd)).toEqual({ ok: true });
    expect(create.mock.calls[0][0].data.slug).toBe("autumn-archive-2026");
  });
});
