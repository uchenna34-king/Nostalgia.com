import { prisma } from "@/lib/db";
import {
  PAGE_SIZE,
  buildProductWhere,
  buildOrderBy,
  paginationMeta,
  parsePage,
  parsePriceRange,
} from "@/lib/catalog";
import { getRatingSummaries, type RatingSummary } from "@/lib/reviews";

export { PAGE_SIZE };

export type ProductVariant = { size: string; stock: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number; // cents
  category: string;
  description: string;
  images: string[];
  sizes: string[];
  variants: ProductVariant[];
  featured: boolean;
  materials?: string | null;
  care?: string | null;
  rating: RatingSummary;
};

function deserialize(row: {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: string;
  description: string;
  sizes: string;
  featured: boolean;
  materials?: string | null;
  care?: string | null;
  images: { url: string }[];
  variants: { size: string; stock: number }[];
}): Omit<Product, "rating"> {
  return {
    ...row,
    images: row.images.map((img) => img.url),
    sizes: JSON.parse(row.sizes) as string[],
    variants: row.variants.map((v) => ({ size: v.size, stock: v.stock })),
  };
}

/**
 * Attach aggregate ratings to a set of deserialized products via ONE bounded
 * getRatingSummaries call (D-04). The zero-review default is mandatory: groupBy
 * omits reviewless products, and an undefined rating would crash the PDP/card or
 * produce NaN in a star-width calc (RESEARCH Pitfall 2). This runs AFTER the
 * stock-aware rows are fetched — rating is never merged into the where clause.
 */
async function withRatings(base: Omit<Product, "rating">[]): Promise<Product[]> {
  const summaries = await getRatingSummaries(base.map((p) => p.id));
  return base.map((p) => ({ ...p, rating: summaries.get(p.id) ?? { avg: 0, count: 0 } }));
}

export async function getProducts(category?: string): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: category && category !== "All" ? { category } : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
    },
  });
  return withRatings(rows.map(deserialize));
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { featured: true },
    orderBy: { createdAt: "asc" },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
    },
  });
  return withRatings(rows.map(deserialize));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
    },
  });
  if (!row) return null;
  const [product] = await withRatings([deserialize(row)]);
  return product;
}

export async function getCategories(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    select: { category: true },
    distinct: ["category"],
  });
  return ["All", ...rows.map((r) => r.category)];
}

export type CatalogParams = {
  q?: string;
  category?: string;
  size?: string;
  price?: string;
  sort?: string;
  page?: number | string;
  collection?: string;
};

export type CatalogResult = {
  products: Product[];
  total: number;
  totalPages: number;
  page: number;
  categories: string[];
};

/**
 * Server-side paginated, searchable, filterable, sortable catalog query
 * (DISC-01/02/03/04, CATL-01). Always a single indexed findMany + a matching
 * count with an identical where — never fetch-all-then-filter/paginate in JS.
 */
export async function getCatalog(params: CatalogParams): Promise<CatalogResult> {
  const { minPrice, maxPrice } = parsePriceRange(params.price);
  const page = parsePage(params.page);

  const where = buildProductWhere({
    q: params.q,
    category: params.category,
    size: params.size,
    minPrice,
    maxPrice,
    collection: params.collection,
  });
  const orderBy = buildOrderBy(params.sort);

  // The row query must run against the *clamped* page (meta.skip/meta.take),
  // not the raw requested page — otherwise an over-range page returns an
  // empty result set while still reporting a valid, in-range page/totalPages.
  const [total, categories] = await Promise.all([
    prisma.product.count({ where }),
    getCategories(),
  ]);

  const meta = paginationMeta(total, page, PAGE_SIZE);

  const rows = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
    },
    skip: meta.skip,
    take: meta.take,
  });

  return {
    products: await withRatings(rows.map(deserialize)),
    total,
    totalPages: meta.totalPages,
    page: meta.page,
    categories,
  };
}

export type CollectionSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export async function getCollections(): Promise<CollectionSummary[]> {
  return prisma.collection.findMany({
    select: { id: true, slug: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
}

export async function getCollectionBySlug(
  slug: string,
): Promise<CollectionSummary | null> {
  return prisma.collection.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, description: true },
  });
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
