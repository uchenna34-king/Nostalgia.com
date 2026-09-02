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

      {/* The Current Edit — live featured catalogue, framed editorially. */}
      <section className="container-x py-24">
        <div className="mb-12 max-w-xl">
          <p className="text-xs uppercase tracking-[0.32em] text-sepia-deep">
            The Current Edit
          </p>
          <h2 className="mt-4 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-5xl">
            Familiar, reframed.
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        <div className="mt-12">
          <Link
            href="/shop"
            className="link-underline text-sm uppercase tracking-[0.2em]"
          >
            View all pieces
          </Link>
        </div>
      </section>

      {/* New Chapter feature — the lead outerwear piece over real photography. */}
      <section className="bg-cream-dark">
        <div className="container-x grid items-stretch gap-0 md:grid-cols-2">
          <div className="relative aspect-[4/5] w-full md:aspect-auto md:min-h-[34rem]">
            <Image
              src="/images/jacket.jpg"
              alt="The field jacket in washed brick, worn open over cream"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center px-6 py-16 md:px-14">
            <p className="text-xs uppercase tracking-[0.32em] text-sepia-deep">
              New Chapter
            </p>
            <h2 className="mt-4 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-5xl">
              The outerwear,
              <br />
              broken in.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-ink-soft">
              Cut from washed cotton and heavy melton, our jackets arrive
              already easy — collars that fall right, hems that settle, colour
              that softens the more you wear it.
            </p>
            <Link href="/shop?category=Outerwear" className="btn-outline mt-9 w-fit">
              See the outerwear
            </Link>
          </div>
        </div>
      </section>

      {/* A Note from the Studio — the house voice over editorial photography. */}
      <section className="container-x grid items-center gap-12 py-24 md:grid-cols-2">
        <div className="relative order-2 aspect-[4/5] w-full md:order-1">
          <Image
            src="/images/editorial.jpg"
            alt="Inside the Nostalgia studio"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="order-1 md:order-2">
          <p className="text-xs uppercase tracking-[0.32em] text-sepia-deep">
            A Note from the Studio
          </p>
          <h2 className="mt-4 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-5xl">
            Clothes with
            <br />
            a point of view.
          </h2>
          <p className="mt-6 max-w-md leading-relaxed text-ink-soft">
            Nostalgia started with a simple question: why do some pieces feel
            like they have always belonged to you? We make considered uniforms
            for the in-between hours — the morning record run, the last train,
            the dinner that runs long.
          </p>
          <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
            Every fabric is selected for what it becomes, not just what it is on
            day one.
          </p>
          <Link
            href="/shop"
            className="link-underline mt-8 inline-block text-sm uppercase tracking-[0.2em]"
          >
            Read our story
          </Link>
        </div>
      </section>

      {/* Lookbook — a full-bleed editorial moment; scrim guarantees legibility. */}
      <section className="relative isolate flex min-h-[70vh] items-end overflow-hidden">
        <Image
          src="/images/lookbook.jpg"
          alt="Chapter 04 lookbook"
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent"
        />
        <div className="container-x pb-16 pt-32 text-cream">
          <p className="text-xs uppercase tracking-[0.32em] text-cream/70">
            The Lookbook
          </p>
          <h2 className="mt-4 max-w-xl font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-5xl">
            A little further
            <br />
            than yesterday.
          </h2>
          <Link
            href="/collections"
            className="btn-outline mt-8 border-cream text-cream hover:bg-cream hover:text-ink"
          >
            See the collection
          </Link>
        </div>
      </section>

      {/* Materials — the closing note on how the clothes age. */}
      <section className="container-x py-24 text-center">
        <p className="text-xs uppercase tracking-[0.32em] text-sepia-deep">
          Materials
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl font-serif text-4xl font-normal leading-[1.08] tracking-[-0.01em] sm:text-5xl">
          The beauty of a thing that wears in.
        </h2>
        <p className="mx-auto mt-6 max-w-md leading-relaxed text-ink-soft">
          Washed cottons, dry-handle wools, and yarn-dyed cloth chosen to soften
          and settle with time — not to look new forever, but to look yours.
        </p>
        <Link
          href="/shop"
          className="link-underline mt-8 inline-block text-sm uppercase tracking-[0.2em]"
        >
          See the pieces
        </Link>
      </section>
    </main>
  );
}
