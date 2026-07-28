import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container-x grid items-center gap-8 py-16 md:grid-cols-2 md:py-24">
        {/* Copy */}
        <div className="animate-fade-up">
          <p className="eyebrow">Autumn Archive — Volume I</p>
          <h1 className="mt-4 font-serif text-6xl font-black leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl">
            Wear the{" "}
            <span className="block italic text-sepia">memory.</span>
          </h1>
          <p className="mt-6 max-w-md text-base text-ink-soft">
            Garments cut from another era and rebuilt for now — vintage
            editorial, quiet luxury, and the confidence of the street.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary">
              Shop the drop
            </Link>
            <Link href="/shop?category=Outerwear" className="btn-outline">
              Outerwear
            </Link>
          </div>
        </div>

        {/* Image collage */}
        <div className="relative grid grid-cols-2 gap-3">
          {/* Above the fold — LCP candidates, so both are `priority` (eager). */}
          <div className="relative col-span-1 mt-8 aspect-[3/4] w-full">
            <Image
              src="/products/sepia-wool-overcoat-1.svg"
              alt="Sepia Wool Overcoat"
              fill
              priority
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          </div>
          <div className="relative col-span-1 aspect-[3/4] w-full">
            <Image
              src="/products/nostalgia-hoodie-1.svg"
              alt="Nostalgia Hoodie"
              fill
              priority
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
