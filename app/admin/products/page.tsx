import { prisma } from "@/lib/db";
import ProductTable from "@/components/admin/ProductTable";

// Rendering is owner-gated by app/admin/layout.tsx (requireOwner).
export default async function AdminProductsPage() {
  // Fetch ALL products directly — NOT getCatalog, which hides fully-sold-out
  // products (D-09). The admin must see sold-out items to restock them.
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: true,
      collections: { select: { id: true } },
    },
  });

  const rows = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    price: p.price,
    featured: p.featured,
    thumbnail: p.images[0]?.url ?? null,
    totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
  }));

  return <ProductTable products={rows} />;
}
