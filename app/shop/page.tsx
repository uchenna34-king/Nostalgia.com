import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getProducts, getCategories } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const active = searchParams.category ?? "All";
  const [products, categories] = await Promise.all([
    getProducts(active),
    getCategories(),
  ]);

  return (
    <main className="container-x py-14">
      <header className="mb-10 text-center">
        <p className="eyebrow">The Collection</p>
        <h1 className="mt-2 font-serif text-5xl font-black sm:text-6xl">
          Shop all
        </h1>
      </header>

      {/* Category filter */}
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {categories.map((c) => {
          const isActive = c === active;
          const href = c === "All" ? "/shop" : `/shop?category=${c}`;
          return (
            <Link
              key={c}
              href={href}
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

      {products.length === 0 ? (
        <p className="py-20 text-center text-ink-soft">
          No pieces in this category yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
