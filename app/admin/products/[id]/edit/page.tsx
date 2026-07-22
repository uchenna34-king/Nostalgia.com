import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const [product, collections] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: { orderBy: { position: "asc" } },
        collections: { select: { id: true } },
      },
    }),
    prisma.collection.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!product) notFound();

  return (
    <ProductForm
      collections={collections}
      initial={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        category: product.category,
        description: product.description,
        materials: product.materials,
        care: product.care,
        featured: product.featured,
        variants: product.variants.map((v) => ({
          size: v.size,
          stock: v.stock,
        })),
        images: product.images.map((img) => ({
          url: img.url,
          alt: img.alt ?? "",
        })),
        collectionIds: product.collections.map((c) => c.id),
      }}
    />
  );
}
