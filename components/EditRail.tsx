import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";

/**
 * The Edit — a curated, ordered sequence rather than a grid. Horizontal
 * scroll-snap keeps the pieces at a size worth looking at instead of shrinking
 * them into a four-up thumbnail wall, and the index reads as curation (this is
 * the fourth chapter's edit, in order), not decoration.
 *
 * Native overflow scrolling: works with touch, trackpad, shift-wheel and
 * keyboard, and needs no JS.
 */
export default function EditRail({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <div
      className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-5 pb-2 sm:-mx-8 sm:gap-7 sm:px-8"
      // A horizontally scrollable region needs to be reachable and announced.
      tabIndex={0}
      role="region"
      aria-label="The current edit — scroll for more pieces"
    >
      {products.map((product, i) => (
        <article
          key={product.id}
          className="w-[74vw] shrink-0 snap-start sm:w-[21rem] lg:w-[25rem]"
        >
          <Link href={`/product/${product.slug}`} className="group block">
            <div className="relative aspect-[4/5] overflow-hidden bg-cream-dark">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 74vw, (max-width: 1024px) 21rem, 25rem"
                className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
              />
              {/* mix-blend-difference keeps the index legible over a light or a
                  dark frame without a plate behind it. */}
              <span
                aria-hidden
                className="absolute left-5 top-5 text-[11px] tabular-nums tracking-[0.3em] text-cream mix-blend-difference"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>

            <div className="mt-5 flex items-baseline justify-between gap-4">
              <h3 className="font-serif text-xl leading-tight">
                {product.name}
              </h3>
              <span className="shrink-0 tabular-nums text-sm text-ink-soft">
                {formatPrice(product.price)}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] uppercase tracking-[0.28em] text-ink-soft">
              {product.category}
            </p>
          </Link>
        </article>
      ))}
    </div>
  );
}
