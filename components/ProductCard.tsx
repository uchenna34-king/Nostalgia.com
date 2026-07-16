import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";
import WishlistButton from "@/components/WishlistButton";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-dark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images[0]}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        {product.images[1] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[1]}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
        <span className="absolute left-3 top-3 bg-cream/85 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-ink">
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
      <div className="mt-3 flex items-baseline justify-between">
        <h3 className="font-serif text-lg leading-tight">{product.name}</h3>
        <span className="text-sm text-ink-soft">{formatPrice(product.price)}</span>
      </div>
    </Link>
  );
}
