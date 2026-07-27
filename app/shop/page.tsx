import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import SearchBox from "@/components/shop/SearchBox";
import FilterPanel from "@/components/shop/FilterPanel";
import Pagination from "@/components/shop/Pagination";
import { getCatalog } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { category?: string };
}): Promise<Metadata> {
  const category = searchParams.category;
  const title =
    category && category !== "All"
      ? `${category} — Nostalgia`
      : "Shop all — Nostalgia";
  const description =
    "Browse the Nostalgia collection — vintage editorial, quiet luxury, and bold streetwear, made in limited runs.";
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

type ShopSearchParams = {
  q?: string;
  category?: string;
  size?: string;
  price?: string;
  sort?: string;
  page?: string;
};

/** Builds the href for a category pill, preserving every other param and
 * resetting page to 1 (D-05 fast path alongside the new FilterPanel). */
function categoryHref(searchParams: ShopSearchParams, category: string) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.size) params.set("size", searchParams.size);
  if (searchParams.price) params.set("price", searchParams.price);
  if (searchParams.sort) params.set("sort", searchParams.sort);
  if (category !== "All") params.set("category", category);
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: ShopSearchParams;
}) {
  const active = searchParams.category ?? "All";
  const { products, totalPages, categories } = await getCatalog({
    q: searchParams.q,
    category: searchParams.category,
    size: searchParams.size,
    price: searchParams.price,
    sort: searchParams.sort,
    page: searchParams.page,
  });

  return (
    <main className="container-x py-14">
      <header className="mb-10 text-center">
        <p className="eyebrow">The Collection</p>
        <h1 className="mt-2 font-serif text-5xl font-black sm:text-6xl">
          Shop all
        </h1>
      </header>

      {/* Category pills — fast path alongside the filter panel (D-05) */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {categories.map((c) => {
          const isActive = c === active;
          return (
            <Link
              key={c}
              href={categoryHref(searchParams, c)}
              className={`border px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${
                isActive
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {c}
            </Link>
          );
        })}
      </div>

      <div className="mb-8">
        <Suspense fallback={<div className="h-12" />}>
          <SearchBox />
        </Suspense>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row">
        <Suspense fallback={<div className="h-12 w-56" />}>
          <FilterPanel categories={categories} />
        </Suspense>

        <div className="flex-1">
          <ProductGrid products={products} />

          <Suspense fallback={<div className="mt-14 h-10" />}>
            <Pagination totalPages={totalPages} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
