import { describe, expect, it } from "vitest";
import { FALLBACK_SIZE_GUIDE, SIZE_GUIDE_CATEGORIES, getSizeGuide } from "@/lib/size-guides";
import { CATEGORIES } from "@/lib/taxonomy";

describe("SIZE_GUIDE_CATEGORIES", () => {
  it("has one guide per taxonomy category, in menu order", () => {
    expect([...SIZE_GUIDE_CATEGORIES]).toEqual(CATEGORIES.map((c) => c.label));
  });

  it("falls back to a guide that exists", () => {
    expect(getSizeGuide(FALLBACK_SIZE_GUIDE)).toBeDefined();
  });
});

describe("getSizeGuide", () => {
  it("returns a well-formed table for each known category", () => {
    for (const category of SIZE_GUIDE_CATEGORIES) {
      const guide = getSizeGuide(category);
      expect(guide).toBeDefined();
      expect(guide!.category).toBe(category);
      expect(typeof guide!.caption).toBe("string");
      expect(guide!.caption.length).toBeGreaterThan(0);
      expect(Array.isArray(guide!.columns)).toBe(true);
      expect(guide!.columns.length).toBeGreaterThan(0);
      expect(Array.isArray(guide!.rows)).toBe(true);
      expect(guide!.rows.length).toBeGreaterThan(0);
      for (const row of guide!.rows) {
        expect(typeof row.size).toBe("string");
        expect(row.size.length).toBeGreaterThan(0);
        expect(Array.isArray(row.cells)).toBe(true);
        expect(row.cells.length).toBe(guide!.columns.length);
      }
    }
  });

  it("returns undefined for an unknown or empty category", () => {
    expect(getSizeGuide("Hats")).toBeUndefined();
    expect(getSizeGuide("")).toBeUndefined();
  });
});
