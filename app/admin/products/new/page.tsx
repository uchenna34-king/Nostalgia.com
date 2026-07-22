import { prisma } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const collections = await prisma.collection.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return <ProductForm collections={collections} />;
}
