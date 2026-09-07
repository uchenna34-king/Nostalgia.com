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
  const { products, total, totalPages, categories } = await getCatalog({
    q: searchParams.q,
    category: searchParams.category,
    size: searchParams.size,
    price: searchParams.price,
    sort: searchParams.sort,
    page: searchParams.page,
  });

  return (
    <main className="container-x py-14">
      {/* Editorial masthead. The heading names where you actually are, and the
          count is live — this is an Operate surface, so the brand shows up in
          the typographic register rather than in decoration. */}
      <header className="mb-10 border-b border-ink/10 pb-9">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-sepia-deep">
              The Collection
            </p>
            <h1 className="mt-4 font-serif font-normal leading-[0.9] tracking-[-0.03em] text-[clamp(2.75rem,8vw,6rem)]">
              {active === "All" ? "Everything" : active}
            </h1>
          </div>
          <p className="pb-2 text-[11px] uppercase tracking-[0.28em] tabular-nums text-ink-soft">
            {total} {total === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </header>

      {/* Category pills — fast path alongside the filter panel (D-05). Scrolls
          horizontally on narrow screens instead of wrapping into a tall block
          that pushes the grid below the fold. */}
      <div className="no-scrollbar -mx-5 mb-8 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
        {categories.map((c) => {
          const isActive = c === active;
          return (
            <Link
              key={c}
              href={categoryHref(searchParams, c)}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 rounded-full border px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] transition-colors ${
                isActive
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/20 text-ink-soft hover:border-ink hover:text-ink"
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
          {/* Gives the grid a section heading so the outline runs h1 -> h2 -> h3
              (ProductCard's name). Without it the page jumped h1 -> h3, which
              breaks heading-order navigation for screen-reader users. Visually
              hidden because the page title already conveys this sighted-side. */}
          <h2 className="sr-only">Products</h2>
          <ProductGrid products={products} />

          <Suspense fallback={<div className="mt-14 h-10" />}>
            <Pagination totalPages={totalPages} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
