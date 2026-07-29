import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import Pagination from "@/components/shop/Pagination";
import { getCatalog, getCollectionBySlug } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const collection = await getCollectionBySlug(params.slug);
  if (!collection) return {};
  const title = `${collection.name} — Nostalgia`;
  const description =
    collection.description ??
    `Shop the ${collection.name} collection from Nostalgia.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

type CollectionSearchParams = {
  sort?: string;
  page?: string;
};

/**
 * Collection detail (DISC-04, D-10, D-12, CATL-01): reuses the exact
 * paginated grid + pagination path from /shop, filtered to this collection
 * via getCatalog's collection parameter. Unknown slugs render the branded
 * not-found (T-08-01) rather than crashing.
 */
export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: CollectionSearchParams;
}) {
  const collection = await getCollectionBySlug(params.slug);
  if (!collection) notFound();

  const { products, totalPages } = await getCatalog({
    collection: params.slug,
    sort: searchParams.sort,
    page: searchParams.page,
  });

  return (
    <main className="container-x py-14">
      <header className="mb-10 text-center">
        <p className="eyebrow">Collection</p>
        <h1 className="mt-2 font-serif text-5xl font-black sm:text-6xl">
          {collection.name}
        </h1>
        {collection.description && (
          <p className="mx-auto mt-4 max-w-xl text-ink-soft">
            {collection.description}
          </p>
        )}
      </header>

      {/* Same heading-order fix as /shop: keeps the outline h1 -> h2 -> h3. */}
      <h2 className="sr-only">Products</h2>
      <ProductGrid products={products} />

      <Suspense fallback={<div className="mt-14 h-10" />}>
        <Pagination totalPages={totalPages} />
      </Suspense>
    </main>
  );
}
