import { prisma } from "@/lib/db";
import CollectionForm from "@/components/admin/CollectionForm";

export default async function NewCollectionPage() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return <CollectionForm products={products} />;
}
