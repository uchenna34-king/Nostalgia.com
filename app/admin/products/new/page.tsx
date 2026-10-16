import { prisma } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";
import { getUsdNgnRate } from "@/lib/settings";

export default async function NewProductPage() {
  const [collections, usdNgnRate] = await Promise.all([
    prisma.collection.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getUsdNgnRate(),
  ]);
  return <ProductForm collections={collections} usdNgnRate={usdNgnRate} />;
}
