import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

// Absolute base resolved from NEXTAUTH_URL (never the request Origin, so crawl
// URLs can't be poisoned via a forged Host header) — matches the checkout route.
const BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3002";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([
    prisma.product.findMany({ select: { slug: true, createdAt: true } }),
    prisma.collection.findMany({ select: { slug: true } }),
  ]);

  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/shop`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/shipping`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/returns`, changeFrequency: "yearly", priority: 0.4 },
    ...products.map((p) => ({
      url: `${BASE}/product/${p.slug}`,
      lastModified: p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...collections.map((c) => ({
      url: `${BASE}/collections/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
