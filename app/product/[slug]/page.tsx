import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/AddToCart";
import Gallery from "@/components/Gallery";
import ProductCard from "@/components/ProductCard";
import WishlistButton from "@/components/WishlistButton";
import {
  getProductBySlug,
  getCatalog,
  formatPrice,
} from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const relatedResult = await getCatalog({
    category: product.category,
    page: 1,
  });
  const related = relatedResult.products
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  const hasDetails = Boolean(product.materials || product.care);

  return (
    <main className="container-x py-10">
      <nav className="mb-8 text-xs uppercase tracking-[0.18em] text-ink-soft">
        <Link href="/shop" className="link-underline">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span>{product.category}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <Gallery images={product.images} name={product.name} />

        {/* Details */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">{product.category}</p>
          <h1 className="mt-2 font-serif text-4xl font-black sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 text-xl text-ink-soft">
            {formatPrice(product.price)}
          </p>
          <p className="mt-6 max-w-md leading-relaxed text-ink-soft">
            {product.description}
          </p>

          <div className="mt-8 flex max-w-sm items-center gap-3">
            <div className="flex-1">
              <AddToCart product={product} />
            </div>
            <WishlistButton
              product={{
                slug: product.slug,
                name: product.name,
                price: product.price,
                image: product.images[0],
              }}
              className="border border-ink/15"
            />
          </div>

          <ul className="mt-8 space-y-1 text-xs uppercase tracking-[0.15em] text-ink-soft">
            <li>— Made in limited runs</li>
            <li>
              —{" "}
              <Link href="/shipping" className="link-underline">
                Free shipping over $200
              </Link>
            </li>
            <li>
              —{" "}
              <Link href="/returns" className="link-underline">
                30-day returns
              </Link>
            </li>
          </ul>

          {hasDetails && (
            <div className="mt-8 max-w-md border-t border-ink/10 pt-6">
              <h2 className="text-xs uppercase tracking-[0.18em] text-ink">
                Materials & Care
              </h2>
              <ul className="mt-3 space-y-1 text-xs uppercase tracking-[0.15em] text-ink-soft">
                {product.materials && <li>— {product.materials}</li>}
                {product.care && <li>— {product.care}</li>}
              </ul>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 font-serif text-3xl font-black">
            More from {product.category}
          </h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
