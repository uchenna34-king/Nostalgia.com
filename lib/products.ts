import { prisma } from "@/lib/db";

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

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
