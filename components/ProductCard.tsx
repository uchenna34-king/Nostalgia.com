import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";
import WishlistButton from "@/components/WishlistButton";
import RatingStars from "@/components/RatingStars";

export default function ProductCard({ product }: { product: Product }) {
  const reviewCount = product.rating?.count ?? 0;
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-dark">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
        />
        {product.images[1] && (
          <Image
            src={product.images[1]}
            alt=""
            aria-hidden
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
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
    </Link>
  );
}
