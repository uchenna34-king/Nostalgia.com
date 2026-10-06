import Image from "next/image";
import ProductLink from "@/components/ProductLink";
import type { Product } from "@/lib/products";
import { CARD_SIZES } from "@/lib/product-transition";
import { formatPrice } from "@/lib/products";
import WishlistButton from "@/components/WishlistButton";
import RatingStars from "@/components/RatingStars";

export default function ProductCard({ product }: { product: Product }) {
  const reviewCount = product.rating?.count ?? 0;
  return (
    <ProductLink
      slug={product.slug}
      image={product.images[0]}
      blurDataUrl={product.imageBlurs[0]}
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-dark">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes={CARD_SIZES}
          placeholder={product.imageBlurs[0] ? "blur" : "empty"}
          blurDataURL={product.imageBlurs[0] ?? undefined}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
        />
        {product.images[1] && (
          <Image
            src={product.images[1]}
            alt=""
            aria-hidden
            fill
            sizes={CARD_SIZES}
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none"
          />
        )}
        <span className="absolute left-3 top-3 bg-cream/90 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-ink backdrop-blur-sm">
          {product.category}
        </span>
        <WishlistButton
          product={{
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: product.images[0],
          }}
          className="absolute right-3 top-3"
        />
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-lg leading-tight">{product.name}</h3>
        <span className="shrink-0 tabular-nums text-sm text-ink-soft">
          {formatPrice(product.price)}
        </span>
      </div>
      {reviewCount > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-ink-soft">
          <RatingStars value={product.rating.avg} size={16} count={reviewCount} />
          <span>({reviewCount})</span>
        </div>
      )}
    </ProductLink>
  );
}
