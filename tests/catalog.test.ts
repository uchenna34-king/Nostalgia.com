import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  SORT_OPTIONS,
  parsePage,
  parsePriceRange,
  buildProductWhere,
  buildOrderBy,
  paginationMeta,
} from "@/lib/catalog";

describe("PAGE_SIZE", () => {
  it("is 24", () => {
    expect(PAGE_SIZE).toBe(24);
  });
});

describe("SORT_OPTIONS", () => {
  it("is an allow-list of the four sort keys with display labels", () => {
    const keys = SORT_OPTIONS.map((o) => o.value);
    expect(keys).toEqual(["price-asc", "price-desc", "name", "newest"]);
    for (const option of SORT_OPTIONS) {
      expect(typeof option.label).toBe("string");
      expect(option.label.length).toBeGreaterThan(0);
    }
  });
});

describe("parsePage", () => {
  it("parses a valid numeric string", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("defaults to 1 for zero, negative, non-numeric, or missing input", () => {
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });

  it("clamps a huge value to a sane max", () => {
    const page = parsePage("999999999");
    expect(page).toBeLessThanOrEqual(100000);
    expect(Number.isInteger(page)).toBe(true);
  });

  it("always returns a positive integer", () => {
    expect(Number.isInteger(parsePage("5.7"))).toBe(true);
    expect(parsePage("5.7")).toBeGreaterThan(0);
  });
});

describe("parsePriceRange", () => {
  it("parses a min-max range", () => {
    expect(parsePriceRange("5000-20000")).toEqual({ minPrice: 5000, maxPrice: 20000 });
  });

  it("parses a min-only range", () => {
    expect(parsePriceRange("5000-")).toEqual({ minPrice: 5000 });
  });

  it("parses a max-only range", () => {
    expect(parsePriceRange("-20000")).toEqual({ maxPrice: 20000 });
  });

  it("ignores malformed input without throwing", () => {
    expect(parsePriceRange("abc")).toEqual({});
  });

  it("ignores a malformed multi-dash value without throwing", () => {
    expect(parsePriceRange("5000--3000")).toEqual({});
  });

  it("returns empty object for undefined", () => {
    expect(parsePriceRange(undefined)).toEqual({});
  });
});

describe("buildProductWhere", () => {
  it("q builds an AND-wrapped OR across name/description/category, case-sensitive", () => {
    const where = buildProductWhere({ q: "wool" });
    const json = JSON.stringify(where);
    expect(json).not.toContain('"mode"');
    const andClauses = (where as { AND: unknown[] }).AND;
    const qClause = andClauses.find(
      (c) => c && typeof c === "object" && "OR" in (c as object),
    ) as { OR: Array<Record<string, { contains: string }>> };
    expect(qClause).toBeDefined();
    expect(qClause.OR).toEqual([
      { name: { contains: "wool" } },
      { description: { contains: "wool" } },
      { category: { contains: "wool" } },
    ]);
  });

  it("category filters when set to a specific value", () => {
    const where = buildProductWhere({ category: "Outerwear" }) as { AND: unknown[] };
    expect(where.AND).toContainEqual({ category: "Outerwear" });
  });

  it('category "All" produces no category clause', () => {
    const where = buildProductWhere({ category: "All" }) as { AND: unknown[] };
    for (const clause of where.AND) {
      expect(clause).not.toHaveProperty("category");
    }
  });

  it("undefined category produces no category clause", () => {
    const where = buildProductWhere({}) as { AND: unknown[] };
    for (const clause of where.AND) {
      expect(clause).not.toHaveProperty("category");
    }
  });

  it("size filters by an in-stock variant relation (not the JSON sizes column)", () => {
    const where = buildProductWhere({ size: "M" }) as { AND: unknown[] };
    const sizeClause = where.AND.find(
      (c) =>
        c &&
        typeof c === "object" &&
        "variants" in (c as object) &&
        (c as { variants: { some: { size?: string } } }).variants.some.size !==
          undefined,
    ) as { variants: { some: { size: string; stock: { gt: number } } } };
    expect(sizeClause).toBeDefined();
    expect(sizeClause.variants.some.size).toBe("M");
    expect(sizeClause.variants.some.stock.gt).toBe(0);
    // the old JSON quote-guard against the `sizes` column must be gone
    for (const clause of where.AND) {
      expect(clause).not.toHaveProperty("sizes");
    }
  });

  it("always includes an in-stock clause (hides fully sold-out products)", () => {
    for (const params of [{}, { category: "Outerwear" }, { q: "wool" }]) {
      const where = buildProductWhere(params) as { AND: unknown[] };
      expect(where.AND).toContainEqual({
        variants: { some: { stock: { gt: 0 } } },
      });
    }
  });

  it("minPrice produces a gte clause", () => {
    const where = buildProductWhere({ minPrice: 1000 }) as { AND: unknown[] };
    expect(where.AND).toContainEqual({ price: { gte: 1000 } });
  });

  it("maxPrice produces an lte clause", () => {
    const where = buildProductWhere({ maxPrice: 5000 }) as { AND: unknown[] };
    expect(where.AND).toContainEqual({ price: { lte: 5000 } });
  });

  it("collection filters by slug via the relation", () => {
    const where = buildProductWhere({ collection: "autumn-archive" }) as { AND: unknown[] };
    expect(where.AND).toContainEqual({
      collections: { some: { slug: "autumn-archive" } },
    });
  });

  it("empty params produce only the always-on in-stock clause", () => {
    const where = buildProductWhere({}) as { AND: unknown[] };
    expect(Array.isArray(where.AND)).toBe(true);
    const nonEmpty = where.AND.filter(
      (c) => c && typeof c === "object" && Object.keys(c as object).length > 0,
    );
    expect(nonEmpty).toEqual([{ variants: { some: { stock: { gt: 0 } } } }]);
  });
});

describe("buildOrderBy", () => {
  it("price-asc", () => {
    expect(buildOrderBy("price-asc")).toEqual({ price: "asc" });
  });

  it("price-desc", () => {
    expect(buildOrderBy("price-desc")).toEqual({ price: "desc" });
  });

  it("name", () => {
    expect(buildOrderBy("name")).toEqual({ name: "asc" });
  });

  it("newest", () => {
    expect(buildOrderBy("newest")).toEqual({ createdAt: "desc" });
  });

  it("defaults to newest when undefined", () => {
    expect(buildOrderBy(undefined)).toEqual({ createdAt: "desc" });
  });

  it("defaults to newest for an unknown/malicious value, never passing it through", () => {
    expect(buildOrderBy("'; DROP TABLE Product; --")).toEqual({ createdAt: "desc" });
  });
});

describe("paginationMeta", () => {
  it("computes totalPages, skip, take", () => {
    const meta = paginationMeta(100, 1, 24);
    expect(meta.totalPages).toBe(5);
    expect(meta.skip).toBe(0);
    expect(meta.take).toBe(24);
  });

  it("hasPrev is false and hasNext is true on page 1 of many", () => {
    const meta = paginationMeta(100, 1, 24);
    expect(meta.hasPrev).toBe(false);
    expect(meta.hasNext).toBe(true);
  });

  it("hasPrev is true and hasNext is false on the last page", () => {
    const meta = paginationMeta(100, 5, 24);
    expect(meta.hasPrev).toBe(true);
    expect(meta.hasNext).toBe(false);
    expect(meta.skip).toBe(96);
  });

  it("totalPages is at least 1 even when total is 0", () => {
    const meta = paginationMeta(0, 1, 24);
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });

  it("a page-beyond-last still returns a valid clamp", () => {
    const meta = paginationMeta(10, 999, 24);
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNext).toBe(false);
    expect(Number.isFinite(meta.skip)).toBe(true);
  });
});
