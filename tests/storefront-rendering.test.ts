// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source guards for the caching rules, in the same spirit as the layout's
// "never reads cookies" check. A storefront page served from cache costs no
// database round trip; one stray per-request call (a session read, a cookie,
// `force-dynamic`) silently turns it back into a live render on every view.

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8");

const STOREFRONT_PAGES = [
  "app/page.tsx",
  "app/shop/[[...slug]]/page.tsx",
  "app/product/[slug]/page.tsx",
  "app/collections/page.tsx",
  "app/collections/[slug]/page.tsx",
];

const CATALOG_READERS = [
  "getCatalog",
  "getProductBySlug",
  "getFeaturedProducts",
  "getProducts",
  "getCollections",
  "getCollectionBySlug",
  "getReviewsForProduct",
];

describe("product page stays a cached page", () => {
  const src = read("app", "product", "[slug]", "page.tsx");

  it("is not forced dynamic and never reads the session, cookies or headers", () => {
    expect(src).not.toContain("force-dynamic");
    expect(src).not.toContain("getServerSession");
    expect(src).not.toMatch(/\bcookies\(\)|\bheaders\(\)/);
  });

  it("is generated on first visit and kept, with an hourly refresh", () => {
    expect(src).toMatch(/export async function generateStaticParams\(\)/);
    expect(src).toMatch(/export const revalidate = 3600;/);
  });

  it("leaves the per-shopper review state to the browser", () => {
    expect(src).toContain("<ReviewFormIsland");
  });
});

describe("collections index", () => {
  it("is a static page, not forced dynamic", () => {
    expect(read("app", "collections", "page.tsx")).not.toContain("force-dynamic");
  });
});

describe("storefront pages read the catalog through the data cache", () => {
  it.each(STOREFRONT_PAGES)("%s imports no uncached catalog reader", (file) => {
    const src = read(file);
    const direct = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@\/lib\/(products|reviews)"/g)]
      .flatMap((m) => m[1].split(",").map((s) => s.trim()))
      .filter((name) => CATALOG_READERS.includes(name));
    expect(direct).toEqual([]);
  });
});

describe("every catalog write refreshes the storefront", () => {
  it.each([
    "app/admin/products/actions.ts",
    "app/admin/collections/actions.ts",
    "app/admin/reviews/actions.ts",
    "app/admin/settings/actions.ts",
    "app/product/[slug]/actions.ts",
  ])("%s calls revalidateStorefront()", (file) => {
    const src = read(file);
    expect(src).toContain('from "@/lib/storefront-revalidate"');
    expect(src).toMatch(/\brevalidateStorefront\(\);/);
  });
});
