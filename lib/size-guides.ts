// Static per-category size-guide config (TRST-02, D-05/D-07). Prisma-free and
// side-effect-free so it stays unit-testable under jsdom. Measurement numbers
// are realistic PLACEHOLDERS in dual-unit "in (cm)" format — the owner edits
// real numbers later (D-07), mirroring the "images supplied later" pattern.

export type SizeGuideRow = {
  /** Row-header label (size code or item name), rendered as <th scope="row">. */
  size: string;
  /** Cells aligned 1:1 with `columns`; cells[0] repeats the size/item label. */
  cells: string[];
};

export type SizeGuide = {
  category: string;
  caption: string;
  columns: string[];
  rows: SizeGuideRow[];
};

/** The four size-guide categories, in D-05 order. */
export const SIZE_GUIDE_CATEGORIES = [
  "Outerwear",
  "Knitwear",
  "Tees",
  "Accessories",
] as const;

const APPAREL_COLUMNS = ["Size", "Chest", "Length", "Sleeve"];

export const SIZE_GUIDES: Record<string, SizeGuide> = {
  Outerwear: {
    category: "Outerwear",
    caption: "Outerwear size guide",
    columns: APPAREL_COLUMNS,
    rows: [
      { size: "XS", cells: ["XS", "35 (89)", "27 (68.5)", "24 (61)"] },
      { size: "S", cells: ["S", "37 (94)", "28 (71)", "24.5 (62)"] },
      { size: "M", cells: ["M", "39 (99)", "29 (73.5)", "25 (63.5)"] },
      { size: "L", cells: ["L", "42 (107)", "30 (76)", "25.5 (65)"] },
      { size: "XL", cells: ["XL", "45 (114)", "31 (78.5)", "26 (66)"] },
    ],
  },
  Knitwear: {
    category: "Knitwear",
    caption: "Knitwear size guide",
    columns: APPAREL_COLUMNS,
    rows: [
      { size: "XS", cells: ["XS", "34 (86)", "25 (63.5)", "23 (58.5)"] },
      { size: "S", cells: ["S", "36 (91.5)", "26 (66)", "23.5 (60)"] },
      { size: "M", cells: ["M", "38 (96.5)", "27 (68.5)", "24 (61)"] },
      { size: "L", cells: ["L", "41 (104)", "28 (71)", "24.5 (62)"] },
      { size: "XL", cells: ["XL", "44 (112)", "29 (73.5)", "25 (63.5)"] },
    ],
  },
  Tees: {
    category: "Tees",
    caption: "Tees size guide",
    columns: ["Size", "Chest", "Length"],
    rows: [
      { size: "XS", cells: ["XS", "34 (86)", "26 (66)"] },
      { size: "S", cells: ["S", "36 (91.5)", "27 (68.5)"] },
      { size: "M", cells: ["M", "38 (96.5)", "28 (71)"] },
      { size: "L", cells: ["L", "41 (104)", "29 (73.5)"] },
      { size: "XL", cells: ["XL", "44 (112)", "30 (76)"] },
    ],
  },
  Accessories: {
    category: "Accessories",
    caption: "Accessories size guide",
    columns: ["Item", "Width", "Length"],
    rows: [
      { size: "Cap", cells: ["Cap", "8 (20.5)", "4 (10)"] },
      { size: "Tote", cells: ["Tote", "15 (38)", "16 (40.5)"] },
      { size: "Scarf", cells: ["Scarf", "12 (30.5)", "70 (178)"] },
    ],
  },
};

/**
 * Trim + case-insensitively match `category` against the four known guides.
 * Returns the matching guide, or `undefined` for an unrecognized/empty category
 * (the call site decides the fallback). Never throws.
 */
export function getSizeGuide(category: string): SizeGuide | undefined {
  const key = category.trim().toLowerCase();
  if (!key) return undefined;
  const match = SIZE_GUIDE_CATEGORIES.find((c) => c.toLowerCase() === key);
  return match ? SIZE_GUIDES[match] : undefined;
}
