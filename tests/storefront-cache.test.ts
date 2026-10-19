import { beforeEach, describe, expect, it, vi } from "vitest";

// Storefront pages read the catalog through Next's data cache, tagged so one
// admin save clears every cached read at once. These tests pin how each reader
// is registered, that results survive the cache's JSON round trip, and what a
// storefront refresh clears.

type CacheOptions = { tags?: string[]; revalidate?: number | false };
// Hoisted with the mocks: the cache module registers its readers on import.
const { registered, revalidateTag, revalidatePath } = vi.hoisted(() => ({
  registered: [] as { keyParts: string[]; options: CacheOptions }[],
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  // Stand-in for the data cache: records the registration and round-trips the
  // result through JSON, which is exactly what the real cache does to it.
  unstable_cache: (
    fn: (...a: unknown[]) => Promise<unknown>,
    keyParts: string[],
    options: CacheOptions,
  ) => {
    registered.push({ keyParts, options });
    return async (...args: unknown[]) => JSON.parse(JSON.stringify(await fn(...args)));
  },
  revalidateTag: (...a: unknown[]) => revalidateTag(...a),
  revalidatePath: (...a: unknown[]) => revalidatePath(...a),
}));

const getReviewsForProduct = vi.fn();
vi.mock("@/lib/reviews", () => ({
  getReviewsForProduct: (...a: unknown[]) => getReviewsForProduct(...a),
}));
vi.mock("@/lib/products", () => ({
  getCatalog: vi.fn(),
  getProductBySlug: vi.fn(),
  getFeaturedProducts: vi.fn(),
  getProducts: vi.fn(),
  getCollections: vi.fn(),
  getCollectionBySlug: vi.fn(),
}));

import { getCachedReviewsForProduct } from "@/lib/storefront-cache";
import { STOREFRONT_TAG, revalidateStorefront } from "@/lib/storefront-revalidate";

beforeEach(() => {
  revalidateTag.mockReset();
  revalidatePath.mockReset();
  getReviewsForProduct.mockReset();
});

describe("storefront data cache", () => {
  it("registers every storefront reader under the storefront tag, with an hourly safety net", () => {
    expect(registered.map((r) => r.keyParts.join("/")).sort()).toEqual([
      "storefront/catalog",
      "storefront/collection",
      "storefront/collections",
      "storefront/featured-products",
      "storefront/product",
      "storefront/products",
      "storefront/reviews",
    ]);
    for (const { options } of registered) {
      expect(options.tags).toEqual([STOREFRONT_TAG]);
      expect(options.revalidate).toBe(3600);
    }
  });

  it("gives review dates back as Dates after the cache's JSON round trip", async () => {
    const createdAt = new Date("2026-10-01T10:00:00.000Z");
    getReviewsForProduct.mockResolvedValue({
      reviews: [{ id: "r1", rating: 5, title: "Lovely", body: null, createdAt, authorName: "Ada" }],
      total: 1,
    });

    const { reviews, total } = await getCachedReviewsForProduct("prod-1");

    expect(getReviewsForProduct).toHaveBeenCalledWith("prod-1");
    expect(total).toBe(1);
    expect(reviews[0].createdAt).toBeInstanceOf(Date);
    expect(reviews[0].createdAt.toISOString()).toBe(createdAt.toISOString());
  });
});

describe("revalidateStorefront", () => {
  it("clears the cached reads and every storefront page that shows catalog data", () => {
    revalidateStorefront();

    expect(revalidateTag).toHaveBeenCalledWith(STOREFRONT_TAG);
    expect(revalidatePath.mock.calls).toEqual([
      ["/"],
      ["/shop/[[...slug]]", "page"],
      ["/product/[slug]", "page"],
      ["/collections"],
      ["/collections/[slug]", "page"],
      ["/sitemap.xml"],
    ]);
  });
});
