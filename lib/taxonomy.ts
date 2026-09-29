// The shop's department → category → section tree.
//
// Prisma-free and side-effect-free, so the storefront, the admin form, the
// server actions and the tests all read one definition. Shape follows the
// research behind it (ASOS, SSENSE, Baymard's taxonomy guidance):
//
//   - Department first. ASOS and SSENSE both split Women / Men before anything
//     else, and every deeper page stays inside the chosen department.
//   - At most three levels (department / category / section). Baymard found
//     over-deep trees are a leading cause of abandonment; SSENSE stops at two.
//   - A section is a real browsing destination ("Running", "Denim"), never an
//     attribute that cuts across every category. Size, price and sort stay
//     filters on the page, not branches of the tree.
//
// Products store `department` and `subcategory` as slugs and `category` as the
// display label (the column predates this tree and is shown on cards, the PDP
// and the size guide). `categoryByLabel` bridges the two.

export type DepartmentSlug = "women" | "men";

/** What a product row may carry. `unisex` pieces appear in both departments. */
export const PRODUCT_DEPARTMENTS = ["women", "men", "unisex"] as const;
export type ProductDepartment = (typeof PRODUCT_DEPARTMENTS)[number];

export type Section = { slug: string; label: string; blurb: string };

export type Category = {
  slug: string;
  /** Stored verbatim in `Product.category`. Renaming one needs a data migration. */
  label: string;
  blurb: string;
  sections: Section[];
};

export type Department = {
  slug: DepartmentSlug;
  label: string;
  /** Possessive form for headings: "Women's shoes". */
  possessive: string;
};

export const DEPARTMENTS: Department[] = [
  { slug: "women", label: "Women", possessive: "Women's" },
  { slug: "men", label: "Men", possessive: "Men's" },
];

/**
 * Categories, in menu order. The four the house is built around come first;
 * the archive categories the existing stock already lives in follow, so no
 * piece falls out of the tree.
 */
export const CATEGORIES: Category[] = [
  {
    slug: "shoes",
    label: "Shoes",
    blurb: "Built for the pavement, the boardroom and everything between.",
    sections: [
      {
        slug: "running",
        label: "Running",
        blurb: "Cushioned trainers for road and track.",
      },
      {
        slug: "corporate",
        label: "Corporate",
        blurb: "Oxfords, derbies and loafers for the working week.",
      },
      {
        slug: "canvas",
        label: "Canvas",
        blurb: "Low-tops and high-tops in washed canvas.",
      },
    ],
  },
  {
    slug: "sweatshirts",
    label: "Sweatshirts",
    blurb: "Loopback, fleece and the hoodies that go with them.",
    sections: [
      {
        slug: "plain",
        label: "Plain",
        blurb: "Clean, unbranded crewnecks and hoodies.",
      },
      {
        slug: "graphic",
        label: "Graphic",
        blurb: "Printed, embroidered and logo pieces.",
      },
    ],
  },
  {
    slug: "jeans",
    label: "Jeans",
    blurb: "Five-pocket cuts, in denim and out of it.",
    sections: [
      {
        slug: "denim",
        label: "Denim",
        blurb: "Raw, rinsed and washed indigo.",
      },
      {
        slug: "non-denim",
        label: "Non-denim",
        blurb: "Cord, twill and canvas in a jean cut.",
      },
    ],
  },
  {
    slug: "shirts-t-shirts",
    label: "Shirts & T-shirts",
    blurb: "From the pressed collar to the everyday tee.",
    sections: [
      {
        slug: "shirts",
        label: "Shirts",
        blurb: "Oxford, poplin and overshirts.",
      },
      {
        slug: "designer-t-shirts",
        label: "Designer T-shirts",
        blurb: "Tees from the houses and labels we carry.",
      },
      {
        slug: "t-shirts",
        label: "Everyday T-shirts",
        blurb: "Unbranded, heavyweight essentials.",
      },
    ],
  },
  {
    slug: "outerwear",
    label: "Outerwear",
    blurb: "Coats and jackets cut from archive patterns.",
    sections: [],
  },
  {
    slug: "knitwear",
    label: "Knitwear",
    blurb: "Lambswool, mohair and cable knits.",
    sections: [],
  },
  {
    slug: "trousers",
    label: "Trousers",
    blurb: "Tailored and pleated, for either register.",
    sections: [],
  },
  {
    slug: "accessories",
    label: "Accessories",
    blurb: "Caps, bags and the finishing pieces.",
    sections: [],
  },
];

export function getDepartment(
  slug: string | undefined,
): Department | undefined {
  return DEPARTMENTS.find((d) => d.slug === slug);
}

export function getCategory(slug: string | undefined): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getSection(
  category: Category,
  slug: string | undefined,
): Section | undefined {
  return category.sections.find((s) => s.slug === slug);
}

/** Case- and whitespace-insensitive, so admin input and legacy rows still match. */
export function categoryByLabel(
  label: string | undefined,
): Category | undefined {
  const key = label?.trim().toLowerCase();
  if (!key) return undefined;
  return CATEGORIES.find((c) => c.label.toLowerCase() === key);
}

/** The department values a shopper in `dept` should see. */
export function departmentScope(dept: DepartmentSlug): ProductDepartment[] {
  return [dept, "unisex"];
}

export function isProductDepartment(v: unknown): v is ProductDepartment {
  return (
    typeof v === "string" &&
    (PRODUCT_DEPARTMENTS as readonly string[]).includes(v)
  );
}

export type ShopLocation = {
  department?: Department;
  category?: Category;
  section?: Section;
};

/**
 * Resolves `/shop/[...slug]` segments. Returns `null` for anything that is not
 * a real place in the tree — an unknown slug, a section under the wrong
 * category, or extra segments — so the route can 404 instead of rendering an
 * empty page that pretends to exist.
 */
export function resolveShopPath(
  segments: string[] | undefined,
): ShopLocation | null {
  const [d, c, s, ...rest] = segments ?? [];
  if (rest.length) return null;
  if (d === undefined) return {};

  const department = getDepartment(d);
  if (!department) return null;
  if (c === undefined) return { department };

  const category = getCategory(c);
  if (!category) return null;
  if (s === undefined) return { department, category };

  const section = getSection(category, s);
  if (!section) return null;
  return { department, category, section };
}

/** `/shop`, `/shop/men`, `/shop/men/shoes`, `/shop/men/shoes/running`. */
export function shopHref(
  department?: DepartmentSlug,
  category?: string,
  section?: string,
): string {
  const parts = ["/shop"];
  if (department) {
    parts.push(department);
    if (category) {
      parts.push(category);
      if (section) parts.push(section);
    }
  }
  return parts.join("/");
}

/** Page heading for a location: "Everything", "Women", "Men's shoes", "Running". */
export function locationTitle(loc: ShopLocation): string {
  if (loc.section) return loc.section.label;
  if (loc.category && loc.department) {
    return `${loc.department.possessive} ${loc.category.label.toLowerCase()}`;
  }
  if (loc.department) return loc.department.label;
  return "Everything";
}

/** Document title, most specific first: "Running — Men's shoes — Nostalgia". */
export function locationMetaTitle(loc: ShopLocation): string {
  if (loc.section && loc.category && loc.department) {
    return `${loc.section.label} — ${loc.department.possessive} ${loc.category.label.toLowerCase()} — Nostalgia`;
  }
  if (loc.category && loc.department) {
    return `${loc.department.possessive} ${loc.category.label.toLowerCase()} — Nostalgia`;
  }
  if (loc.department) return `Shop ${loc.department.possessive} — Nostalgia`;
  return "Shop all — Nostalgia";
}

/**
 * Size facet order: letter sizes XXS→XXXL, then numeric sizes ascending (waist
 * and shoe sizes), then anything else ("One Size") alphabetically last.
 */
const LETTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
export function compareSizes(a: string, b: string): number {
  const rank = (s: string): [number, number] => {
    const letter = LETTER_SIZES.indexOf(s.toUpperCase());
    if (letter !== -1) return [0, letter];
    const num = Number(s.replace(/^(UK|EU|US)\s*/i, ""));
    if (s.trim() !== "" && Number.isFinite(num)) return [1, num];
    return [2, 0];
  };
  const [ga, na] = rank(a);
  const [gb, nb] = rank(b);
  return ga - gb || na - nb || a.localeCompare(b);
}
