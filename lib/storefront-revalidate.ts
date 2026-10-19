import { revalidatePath, revalidateTag } from "next/cache";

/**
 * One tag for every cached read a shopper sees (lib/storefront-cache.ts).
 *
 * Deliberately a single tag rather than one per model: product cards carry
 * ratings, prices carry the store rate, collection pages carry products — so
 * almost every write touches almost every read anyway, and one tag means a
 * write can never forget a dependency.
 */
export const STOREFRONT_TAG = "storefront";

/**
 * Every storefront route that renders catalog data. Kept in one list so each
 * write path refreshes the same set: the hand-kept copies in the admin actions
 * had drifted (one refreshed only the bare `/shop`, missing `/shop/men` and
 * every page below it).
 */
const STOREFRONT_ROUTES: ReadonlyArray<readonly [string] | readonly [string, "page"]> = [
  ["/"],
  ["/shop/[[...slug]]", "page"],
  ["/product/[slug]", "page"],
  ["/collections"],
  ["/collections/[slug]", "page"],
  ["/sitemap.xml"],
];

/**
 * Call after ANY write that changes what a shopper sees — products, stock,
 * images, collections, reviews, the exchange rate. Clears the cached reads
 * (the tag) and the cached pages built from them (the paths). Server Actions
 * and Route Handlers only.
 */
export function revalidateStorefront(): void {
  revalidateTag(STOREFRONT_TAG);
  for (const [path, type] of STOREFRONT_ROUTES) {
    if (type) revalidatePath(path, type);
    else revalidatePath(path);
  }
}
