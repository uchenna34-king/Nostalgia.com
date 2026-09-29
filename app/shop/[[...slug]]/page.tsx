import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import SearchBox from "@/components/shop/SearchBox";
import FilterPanel from "@/components/shop/FilterPanel";
import Pagination from "@/components/shop/Pagination";
import {
  Breadcrumbs,
  CategoryTree,
  DepartmentTabs,
  LocationChips,
} from "@/components/shop/ShopNav";
import { getCatalog } from "@/lib/products";
import {
  categoryByLabel,
  locationMetaTitle,
  locationTitle,
  resolveShopPath,
  shopHref,
  type ShopLocation,
} from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

type ShopParams = { slug?: string[] };

type ShopSearchParams = {
  q?: string;
  /** Legacy flat filter, still honoured on /shop so old links keep working. */
  category?: string;
  size?: string;
  price?: string;
  sort?: string;
  page?: string;
};

/**
 * `/shop/[[...slug]]` — one route for every place in the tree:
 *
 *   /shop                      everything, both departments
 *   /shop/men                  a department
 *   /shop/men/shoes            a category within it
 *   /shop/men/shoes/running    a section within that
 *
 * Structure follows ASOS / SSENSE: department first, then category, then
 * section, with size / price / sort as filters on whichever page you are on.
 * Unknown paths 404 rather than rendering an empty page that pretends to exist.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: ShopParams;
  searchParams: ShopSearchParams;
}): Promise<Metadata> {
  const loc = resolveShopPath(params.slug);
  if (!loc) return { title: "Not found — Nostalgia" };

  const legacy = !loc.department
    ? categoryByLabel(searchParams.category)
    : undefined;
  const title = legacy ? `${legacy.label} — Nostalgia` : locationMetaTitle(loc);
  const description =
    loc.section?.blurb ??
    loc.category?.blurb ??
    "Browse the Nostalgia collection — vintage editorial, quiet luxury, and bold streetwear, made in limited runs.";

  return {
    title,
    description,
    alternates: {
      canonical: shopHref(
        loc.department?.slug,
        loc.category?.slug,
        loc.section?.slug,
      ),
    },
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

function kicker(loc: ShopLocation): string {
  if (loc.section && loc.category && loc.department) {
    return `${loc.department.possessive} ${loc.category.label.toLowerCase()}`;
  }
  if (loc.category && loc.department) return loc.department.label;
  return "The Collection";
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: ShopParams;
  searchParams: ShopSearchParams;
}) {
  const loc = resolveShopPath(params.slug);
  if (!loc) notFound();

  // `?category=` only means something on /shop itself; deeper pages take their
  // category from the path, and a stray query value must not narrow them.
  const legacyCategory = !loc.department ? searchParams.category : undefined;
  const legacy = categoryByLabel(legacyCategory);

  const { products, total, totalPages, sizes } = await getCatalog({
    q: searchParams.q,
    department: loc.department?.slug,
    category: loc.category?.label ?? legacyCategory,
    subcategory: loc.section?.slug,
    size: searchParams.size,
    price: searchParams.price,
    sort: searchParams.sort,
    page: searchParams.page,
  });

  const heading = legacy ? legacy.label : locationTitle(loc);
  const blurb = loc.section?.blurb ?? loc.category?.blurb ?? legacy?.blurb;
  const filtered = Boolean(
    searchParams.q || searchParams.size || searchParams.price,
  );

  // An empty *place* (nothing stocked there yet) reads differently from an
  // empty *filter result* — the shopper did nothing wrong, so don't tell them
  // to adjust their filters.
  const empty = filtered ? undefined : (
    <div className="border border-ink/10 px-6 py-20 text-center">
      <p className="font-serif text-[1.25rem] leading-tight text-ink">
        Nothing here just yet.
      </p>
      <p className="mx-auto mt-4 max-w-[44ch] text-[16px] leading-[1.75] text-ink-soft">
        New pieces arrive in small runs, so this shelf fills and empties. Check
        back soon, or step back to see what is in now.
      </p>
      <Link
        href={
          loc.section && loc.department && loc.category
            ? shopHref(loc.department.slug, loc.category.slug)
            : loc.department
              ? shopHref(loc.department.slug)
              : "/shop"
        }
        className="mt-8 inline-block text-[11px] font-medium uppercase tracking-[0.2em] text-ink underline decoration-sepia decoration-2 underline-offset-8 hover:text-ink-soft"
      >
        {loc.section && loc.category
          ? `All ${loc.category.label.toLowerCase()}`
          : loc.department
            ? `All ${loc.department.possessive.toLowerCase()}`
            : "Everything"}
      </Link>
    </div>
  );

  return (
    <main className="container-x py-14">
      <Breadcrumbs loc={loc} />
      <DepartmentTabs loc={loc} sort={searchParams.sort} />

      {/* Editorial masthead. The heading names where you actually are, and the
          count is live — this is an Operate surface, so the brand shows up in
          the typographic register rather than in decoration. */}
      <header className="mb-10 border-b border-ink/10 pb-9">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-sepia-deep">
              {kicker(loc)}
            </p>
            <h1 className="mt-4 font-serif font-normal leading-[0.9] tracking-[-0.03em] text-[clamp(2.75rem,8vw,6rem)]">
              {heading}
            </h1>
            {blurb && <p className="measure mt-5">{blurb}</p>}
          </div>
          <p className="pb-2 text-[11px] font-medium uppercase tracking-[0.28em] tabular-nums text-ink-soft">
            {total} {total === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </header>

      <LocationChips
        loc={loc}
        sort={searchParams.sort}
        legacyCategory={legacy?.label}
      />

      <div className="mb-8">
        <Suspense fallback={<div className="h-12" />}>
          <SearchBox />
        </Suspense>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row">
        <Suspense fallback={<div className="h-12 w-56" />}>
          <FilterPanel sizes={sizes}>
            <CategoryTree loc={loc} sort={searchParams.sort} />
          </FilterPanel>
        </Suspense>

        <div className="min-w-0 flex-1">
          {/* Gives the grid a section heading so the outline runs h1 -> h2 -> h3
              (ProductCard's name). Visually hidden because the page title
              already conveys this sighted-side. */}
          <h2 className="sr-only">Products</h2>
          <ProductGrid products={products} empty={empty} />

          <Suspense fallback={<div className="mt-14 h-10" />}>
            <Pagination totalPages={totalPages} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
