import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  categoryByLabel,
  compareSizes,
  departmentScope,
  isProductDepartment,
  locationMetaTitle,
  locationTitle,
  resolveShopPath,
  shopHref,
} from "@/lib/taxonomy";
import { buildProductWhere } from "@/lib/catalog";

describe("taxonomy shape", () => {
  it("leads with the four house categories and their sections", () => {
    const tree = Object.fromEntries(
      CATEGORIES.map((c) => [c.slug, c.sections.map((s) => s.slug)]),
    );
    expect(tree.shoes).toEqual(["running", "corporate", "canvas"]);
    expect(tree.sweatshirts).toEqual(["plain", "graphic"]);
    expect(tree.jeans).toEqual(["denim", "non-denim"]);
    expect(tree["shirts-t-shirts"]).toEqual(["shirts", "designer-t-shirts", "t-shirts"]);
    expect(CATEGORIES.slice(0, 4).map((c) => c.slug)).toEqual([
      "shoes",
      "sweatshirts",
      "jeans",
      "shirts-t-shirts",
    ]);
  });

  it("has unique slugs and labels, so URLs and stored labels never collide", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    const labels = CATEGORIES.map((c) => c.label.toLowerCase());
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(labels).size).toBe(labels.length);
    for (const c of CATEGORIES) {
      const s = c.sections.map((x) => x.slug);
      expect(new Set(s).size).toBe(s.length);
      for (const slug of [c.slug, ...s]) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});

describe("resolveShopPath", () => {
  it("resolves every depth of the tree", () => {
    expect(resolveShopPath(undefined)).toEqual({});
    expect(resolveShopPath([])).toEqual({});
    expect(resolveShopPath(["men"])?.department?.slug).toBe("men");
    const cat = resolveShopPath(["women", "jeans"]);
    expect(cat?.department?.slug).toBe("women");
    expect(cat?.category?.slug).toBe("jeans");
    expect(cat?.section).toBeUndefined();
    const sec = resolveShopPath(["men", "shoes", "running"]);
    expect(sec?.section?.label).toBe("Running");
  });

  it("rejects anything that is not a real place", () => {
    expect(resolveShopPath(["kids"])).toBeNull();
    expect(resolveShopPath(["men", "hats"])).toBeNull();
    // A real section under the wrong category.
    expect(resolveShopPath(["men", "jeans", "running"])).toBeNull();
    // A category with no sections has no deeper level.
    expect(resolveShopPath(["men", "outerwear", "anything"])).toBeNull();
    expect(resolveShopPath(["men", "shoes", "running", "extra"])).toBeNull();
    // Category-first paths are not a thing: department always leads.
    expect(resolveShopPath(["shoes"])).toBeNull();
  });

  it("round-trips with shopHref", () => {
    expect(shopHref()).toBe("/shop");
    expect(shopHref("women")).toBe("/shop/women");
    expect(shopHref("men", "shoes", "running")).toBe("/shop/men/shoes/running");
    // A section without a category (or a category without a department) is
    // dropped rather than producing a path that would 404.
    expect(shopHref(undefined, "shoes")).toBe("/shop");
    const loc = resolveShopPath(shopHref("men", "jeans", "non-denim").split("/").slice(2));
    expect(loc?.section?.slug).toBe("non-denim");
  });
});

describe("titles", () => {
  it("names each depth the way a shopper would say it", () => {
    expect(locationTitle({})).toBe("Everything");
    expect(locationTitle(resolveShopPath(["women"])!)).toBe("Women");
    expect(locationTitle(resolveShopPath(["men", "shoes"])!)).toBe("Men's shoes");
    expect(locationTitle(resolveShopPath(["men", "shoes", "canvas"])!)).toBe("Canvas");
    expect(locationMetaTitle(resolveShopPath(["women", "jeans", "denim"])!)).toBe(
      "Denim — Women's jeans — Nostalgia",
    );
  });
});

describe("categoryByLabel", () => {
  it("matches stored labels loosely and rejects unknowns", () => {
    expect(categoryByLabel("Shirts & T-shirts")?.slug).toBe("shirts-t-shirts");
    expect(categoryByLabel("  shoes ")?.slug).toBe("shoes");
    expect(categoryByLabel("Tees")).toBeUndefined();
    expect(categoryByLabel("")).toBeUndefined();
    expect(categoryByLabel(undefined)).toBeUndefined();
  });
});

describe("departments", () => {
  it("includes unisex pieces in both departments", () => {
    expect(departmentScope("women")).toEqual(["women", "unisex"]);
    expect(departmentScope("men")).toEqual(["men", "unisex"]);
  });

  it("only accepts the three stored values", () => {
    expect(isProductDepartment("men")).toBe(true);
    expect(isProductDepartment("unisex")).toBe(true);
    expect(isProductDepartment("kids")).toBe(false);
    expect(isProductDepartment(undefined)).toBe(false);
  });
});

describe("compareSizes", () => {
  it("orders letters, then numbers, then everything else", () => {
    const sizes = ["One Size", "UK 10", "L", "32", "XS", "UK 7", "28", "M", "XXL"];
    expect([...sizes].sort(compareSizes)).toEqual([
      "XS", "M", "L", "XXL", "UK 7", "UK 10", "28", "32", "One Size",
    ]);
  });
});

describe("buildProductWhere — tree clauses", () => {
  it("scopes by department list and section", () => {
    const where = buildProductWhere({
      departments: ["men", "unisex"],
      category: "Shoes",
      subcategory: "running",
    }) as { AND: unknown[] };
    expect(where.AND).toContainEqual({ department: { in: ["men", "unisex"] } });
    expect(where.AND).toContainEqual({ category: "Shoes" });
    expect(where.AND).toContainEqual({ subcategory: "running" });
  });

  it("adds no department or section clause when absent", () => {
    const where = buildProductWhere({ departments: [] }) as { AND: object[] };
    for (const clause of where.AND) {
      expect(clause).not.toHaveProperty("department");
      expect(clause).not.toHaveProperty("subcategory");
    }
  });
});
