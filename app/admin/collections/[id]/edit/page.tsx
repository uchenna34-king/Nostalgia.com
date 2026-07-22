import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import CollectionForm from "@/components/admin/CollectionForm";

export default async function EditCollectionPage({
  params,
}: {
  params: { id: string };
}) {
  const [collection, products] = await Promise.all([
    prisma.collection.findUnique({
      where: { id: params.id },
      include: { products: { select: { id: true } } },
    }),
    prisma.product.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!collection) notFound();

  return (
    <CollectionForm
      products={products}
      initial={{
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        productIds: collection.products.map((p) => p.id),
      }}
    />
  );
}
