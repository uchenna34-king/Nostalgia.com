import { prisma } from "@/lib/db";
import CollectionTable from "@/components/admin/CollectionTable";

// Rendering is owner-gated by app/admin/layout.tsx (requireOwner).
export default async function AdminCollectionsPage() {
  const collections = await prisma.collection.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  const rows = collections.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c._count.products,
  }));

  return <CollectionTable collections={rows} />;
}
