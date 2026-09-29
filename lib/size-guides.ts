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

/** One guide per lib/taxonomy.ts category, in menu order. Keys are the
 * category *labels*, because that is what `Product.category` stores. */
export const SIZE_GUIDE_CATEGORIES = [
  "Shoes",
  "Sweatshirts",
  "Jeans",
  "Shirts & T-shirts",
  "Outerwear",
  "Knitwear",
  "Trousers",
  "Accessories",
] as const;

/** Guide shown when a product's category has none of its own. */
export const FALLBACK_SIZE_GUIDE = "Shirts & T-shirts";

const APPAREL_COLUMNS = ["Size", "Chest", "Length", "Sleeve"];
const WAIST_COLUMNS = ["Size", "Waist", "Hip", "Inseam"];

// Tops share one chest/length scale; tees drop the sleeve column.
const TOP_ROWS = (sleeve: boolean): SizeGuideRow[] =>
  [
    ["XS", "34 (86)", "26 (66)", "23 (58.5)"],
    ["S", "36 (91.5)", "27 (68.5)", "23.5 (60)"],
    ["M", "38 (96.5)", "28 (71)", "24 (61)"],
    ["L", "41 (104)", "29 (73.5)", "24.5 (62)"],
    ["XL", "44 (112)", "30 (76)", "25 (63.5)"],
  ].map(([size, chest, length, sl]) => ({
    size,
    cells: sleeve ? [size, chest, length, sl] : [size, chest, length],
  }));

const WAIST_ROWS: SizeGuideRow[] = [
  ["28", "28 (71)", "36 (91.5)", "32 (81)"],
  ["30", "30 (76)", "38 (96.5)", "32 (81)"],
  ["32", "32 (81)", "40 (101.5)", "32 (81)"],
  ["34", "34 (86)", "42 (106.5)", "32 (81)"],
  ["36", "36 (91.5)", "44 (112)", "32 (81)"],
].map(([size, ...rest]) => ({ size, cells: [size, ...rest] }));

export const SIZE_GUIDES: Record<string, SizeGuide> = {
  Shoes: {
    category: "Shoes",
    caption: "Shoes size guide",
    columns: ["Size", "EU", "US men", "US women", "Foot length"],
    rows: [
      ["UK 5", "38", "6", "7", "9.4 (24)"],
      ["UK 6", "39", "7", "8", "9.8 (24.8)"],
      ["UK 7", "41", "8", "9", "10.1 (25.7)"],
      ["UK 8", "42", "9", "10", "10.4 (26.5)"],
      ["UK 9", "43", "10", "11", "10.8 (27.3)"],
      ["UK 10", "44.5", "11", "12", "11.1 (28.2)"],
      ["UK 11", "46", "12", "13", "11.4 (29)"],
    ].map(([size, ...rest]) => ({ size, cells: [size, ...rest] })),
  },
  Sweatshirts: {
    category: "Sweatshirts",
    caption: "Sweatshirts size guide",
    columns: APPAREL_COLUMNS,
    rows: TOP_ROWS(true),
  },
  Jeans: {
    category: "Jeans",
    caption: "Jeans size guide",
    columns: WAIST_COLUMNS,
    rows: WAIST_ROWS,
  },
  "Shirts & T-shirts": {
    category: "Shirts & T-shirts",
    caption: "Shirts & T-shirts size guide",
    columns: APPAREL_COLUMNS,
    rows: TOP_ROWS(true),
  },
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
  Trousers: {
    category: "Trousers",
    caption: "Trousers size guide",
    columns: WAIST_COLUMNS,
    rows: WAIST_ROWS,
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
 * Trim + case-insensitively match `category` against the known guides.
 * Returns the matching guide, or `undefined` for an unrecognized/empty category
 * (the call site decides the fallback). Never throws.
 */
export function getSizeGuide(category: string): SizeGuide | undefined {
  const key = category.trim().toLowerCase();
  if (!key) return undefined;
  const match = SIZE_GUIDE_CATEGORIES.find((c) => c.toLowerCase() === key);
  return match ? SIZE_GUIDES[match] : undefined;
}
