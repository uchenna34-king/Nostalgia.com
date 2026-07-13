import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/AddToCart";
import ProductCard from "@/components/ProductCard";
import {
  getProductBySlug,
  getProducts,
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

  const related = (await getProducts(product.category))
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

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
        {/* Gallery */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {product.images.map((img, i) => (
            <div
              key={i}
              className={`aspect-[3/4] overflow-hidden bg-cream-dark ${
                product.images.length > 1 && i === 0 ? "sm:col-span-2" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`${product.name} view ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

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

          <div className="mt-8 max-w-sm">
            <AddToCart product={product} />
          </div>

          <ul className="mt-8 space-y-1 text-xs uppercase tracking-[0.15em] text-ink-soft">
            <li>— Made in limited runs</li>
            <li>— Free shipping over $200</li>
            <li>— 30-day returns</li>
          </ul>
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
