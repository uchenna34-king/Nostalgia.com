import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";

/**
 * Server component rendering the responsive product grid (extracted from the
 * former inline shop-page markup). Shows a friendly empty state when there
 * are no matches for the current search/filter combination.
 */
export default function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="py-20 text-center text-ink-soft">
        No pieces match your search yet — try adjusting your filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
