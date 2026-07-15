import { prisma } from "@/lib/db";
import {
  PAGE_SIZE,
  buildProductWhere,
  buildOrderBy,
  paginationMeta,
  parsePage,
  parsePriceRange,
} from "@/lib/catalog";

export { PAGE_SIZE };

export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number; // cents
  category: string;
  description: string;
  images: string[];
  sizes: string[];
  featured: boolean;
  materials?: string | null;
  care?: string | null;
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
}): Product {
  return {
    ...row,
    images: row.images.map((img) => img.url),
    sizes: JSON.parse(row.sizes) as string[],
  };
}

export async function getProducts(category?: string): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: category && category !== "All" ? { category } : undefined,
    orderBy: { createdAt: "asc" },
    include: { images: { orderBy: { position: "asc" } } },
  });
  return rows.map(deserialize);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { featured: true },
    orderBy: { createdAt: "asc" },
    include: { images: { orderBy: { position: "asc" } } },
  });
  return rows.map(deserialize);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { position: "asc" } } },
  });
  return row ? deserialize(row) : null;
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

  // Compute skip/take from the requested page against PAGE_SIZE; the total
  // count (below) is used afterward to clamp the *reported* page/meta via
  // paginationMeta, but the query itself always runs against the requested
  // page so a single round trip suffices.
  const skip = (page - 1) * PAGE_SIZE;

  const [rows, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      include: { images: { orderBy: { position: "asc" } } },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    getCategories(),
  ]);

  const meta = paginationMeta(total, page, PAGE_SIZE);

  return {
    products: rows.map(deserialize),
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
