import Image from "next/image";
import Link from "next/link";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import ProductCard from "@/components/ProductCard";
import { getFeaturedProducts } from "@/lib/products";

export default async function Home() {
  const featured = await getFeaturedProducts();

  return (
    <main>
      <Hero />
      <Marquee />

      {/* Featured grid */}
      <section className="container-x py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="eyebrow">The Drop</p>
            <h2 className="mt-2 font-serif text-4xl font-black sm:text-5xl">
              Featured pieces
            </h2>
          </div>
          <Link
            href="/shop"
            className="link-underline hidden text-sm uppercase tracking-[0.18em] sm:block"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Editorial band */}
      <section className="bg-ink text-cream">
        <div className="container-x grid items-center gap-10 py-20 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-sepia">
              The House of Nostalgia
            </p>
            <h2 className="mt-4 font-serif text-4xl font-black leading-tight sm:text-5xl">
              Clothes that remember where they came from.
            </h2>
            <p className="mt-5 max-w-md text-cream/70">
              Every piece is drawn from an archive of forgotten silhouettes, then
              rebuilt with modern hands and honest materials. Made in small runs,
              meant to be kept.
            </p>
            <Link href="/shop" className="btn-outline mt-8 border-cream text-cream hover:bg-cream hover:text-ink">
              Explore the collection
            </Link>
          </div>
          {/* Below the fold — lazy (the next/image default, no `priority`). */}
          <div className="relative aspect-[4/5] w-full">
            <Image
              src="/products/archive-bomber-jacket-1.svg"
              alt="Archive Bomber Jacket"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
