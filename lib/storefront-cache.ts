import { unstable_cache } from "next/cache";
import {
  getCatalog,
  getCollectionBySlug,
  getCollections,
  getFeaturedProducts,
  getProductBySlug,
  getProducts,
} from "@/lib/products";
import { getReviewsForProduct, type ReviewWithAuthor } from "@/lib/reviews";
import { STOREFRONT_TAG } from "@/lib/storefront-revalidate";

/**
 * Cached catalog reads for STOREFRONT pages only.
 *
 * Each reader goes through Next's data cache, keyed by its arguments (so every
 * shop filter, sort, page and currency is its own entry) and tagged
 * STOREFRONT_TAG. A cache hit costs no database round trip — a shop page view
 * used to cost 7 queries, a product page 20+. Writes clear the tag through
 * revalidateStorefront() (lib/storefront-revalidate.ts); the hourly
 * `revalidate` is only a safety net for changes made outside the app (seed,
 * scripts, a hand edit in the database console).
 *
 * Admin pages keep importing the uncached readers from lib/products so the
 * owner always sees the live database.
 *
 * Values are stored as JSON: anything that is not plain JSON (a Date) must be
 * revived on the way out, as getCachedReviewsForProduct does.
 */
const SAFETY_NET_SECONDS = 3600;
const options = { tags: [STOREFRONT_TAG], revalidate: SAFETY_NET_SECONDS };

export const getCachedCatalog = unstable_cache(getCatalog, ["storefront", "catalog"], options);

export const getCachedProductBySlug = unstable_cache(
  getProductBySlug,
  ["storefront", "product"],
  options,
);

export const getCachedFeaturedProducts = unstable_cache(
  getFeaturedProducts,
  ["storefront", "featured-products"],
  options,
);

export const getCachedProducts = unstable_cache(getProducts, ["storefront", "products"], options);

export const getCachedCollections = unstable_cache(
  getCollections,
  ["storefront", "collections"],
  options,
);

export const getCachedCollectionBySlug = unstable_cache(
  getCollectionBySlug,
  ["storefront", "collection"],
  options,
);

const reviewsForProduct = unstable_cache(
  (productId: string) => getReviewsForProduct(productId),
  ["storefront", "reviews"],
  options,
);

/** Visible reviews for a product, with `createdAt` revived to a Date. */
export async function getCachedReviewsForProduct(
  productId: string,
): Promise<{ reviews: ReviewWithAuthor[]; total: number }> {
  const { reviews, total } = await reviewsForProduct(productId);
  return {
    total,
    reviews: reviews.map((r) => ({ ...r, createdAt: new Date(r.createdAt) })),
  };
}
