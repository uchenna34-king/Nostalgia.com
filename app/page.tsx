import Image from "next/image";
import Link from "next/link";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import EditRail from "@/components/EditRail";
import { getFeaturedProducts } from "@/lib/products";

/** Shared arrow for glass controls — one drawn mark, one stroke weight. */
function Arrow({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export default async function Home() {
  const featured = await getFeaturedProducts();

  return (
    <main>
      <Hero />
      <Marquee />

      {/* ── The Edit: a curated sequence, scrolled rather than gridded ── */}
      <section className="container-x reveal py-24 md:py-32">
        <div className="flex flex-wrap items-end justify-between gap-6 pb-12">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-sepia-deep">
              The current edit
            </p>
            <h2 className="mt-5 font-serif font-normal leading-[0.9] tracking-[-0.025em] text-[clamp(2.5rem,7vw,5.5rem)]">
              Familiar,
              <span className="italic"> reframed.</span>
            </h2>
          </div>
          <Link
            href="/shop"
            className="link-underline pb-2 text-xs uppercase tracking-[0.24em]"
          >
            All pieces
          </Link>
        </div>

        <EditRail products={featured} />
      </section>

      {/* ── Two chapters, given equal weight and full height ── */}
      <section className="reveal grid gap-px bg-ink/10 md:grid-cols-2">
        {[
          {
            href: "/shop?category=Outerwear",
            img: "/images/jacket.jpg",
            alt: "The field jacket in washed brick",
            index: "Chapter 04.1",
            title: "Broken in\non arrival.",
            cta: "See the outerwear",
          },
          {
            href: "/collections",
            img: "/images/lookbook.jpg",
            alt: "Chapter 04 lookbook",
            index: "Chapter 04.2",
            title: "A little further\nthan yesterday.",
            cta: "See the lookbook",
          },
        ].map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group relative isolate flex min-h-[34rem] flex-col justify-end overflow-hidden md:min-h-[44rem]"
          >
            <Image
              src={tile.img}
              alt={tile.alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="-z-10 object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05] motion-reduce:transition-none"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent"
            />

            <div className="p-8 text-cream md:p-12">
              <p className="text-[11px] uppercase tracking-[0.32em] text-cream/70">
                {tile.index}
              </p>
              <h2 className="mt-4 whitespace-pre-line font-serif font-normal leading-[0.92] tracking-[-0.02em] text-[clamp(2rem,4.2vw,3.5rem)]">
                {tile.title}
              </h2>
              <span className="btn-glass mt-8">
                {tile.cta}
                <Arrow />
              </span>
            </div>
          </Link>
        ))}
      </section>

      {/* ── Studio manifesto: deliberately off-grid ── */}
      <section className="container-x reveal py-24 md:py-36">
        <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5 md:col-start-1">
            <div className="relative aspect-[4/5] w-full">
              <Image
                src="/images/editorial.jpg"
                alt="Inside the Nostalgia studio"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <p className="text-[11px] uppercase tracking-[0.32em] text-sepia-deep">
              From the studio
            </p>
            <h2 className="mt-5 font-serif font-normal leading-[0.92] tracking-[-0.025em] text-[clamp(2.25rem,5.5vw,4.5rem)]">
              Why do some pieces feel like they{" "}
              <span className="italic text-sepia-deep">always belonged</span> to
              you?
            </h2>
            <p className="mt-8 max-w-md leading-relaxed text-ink-soft">
              We make considered uniforms for the in-between hours — the morning
              record run, the last train, the dinner that runs long. Every fabric
              is selected for what it becomes, not just what it is on day one.
            </p>
            <Link href="/shop" className="btn-primary mt-10">
              Read our story
            </Link>
          </div>
        </div>
      </section>

      {/* ── Closing statement: type alone carries it ── */}
      <section className="border-t border-ink/10 bg-cream-dark">
        <div className="container-x reveal py-24 text-center md:py-36">
          <p className="text-[11px] uppercase tracking-[0.32em] text-sepia-deep">
            Materials
          </p>
          <h2 className="mx-auto mt-6 max-w-5xl font-serif font-normal leading-[0.95] tracking-[-0.025em] text-[clamp(2.25rem,6.5vw,5rem)]">
            Made to soften, settle,
            <br className="hidden sm:block" /> and{" "}
            <span className="italic">look like yours.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-md leading-relaxed text-ink-soft">
            Washed cottons, dry-handle wools, and yarn-dyed cloth — chosen for
            how they age, not how they photograph on day one.
          </p>
          <Link href="/shop" className="btn-primary mt-10">
            See the pieces
          </Link>
        </div>
      </section>
    </main>
  );
}
