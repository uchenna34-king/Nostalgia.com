import Image from "next/image";
import Link from "next/link";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import EditRail from "@/components/EditRail";
import Wordmark from "@/components/Wordmark";
import TrustStrip from "@/components/home/TrustStrip";
import CategoryTiles, {
  type CategoryTile,
} from "@/components/home/CategoryTiles";
import Newsletter from "@/components/home/Newsletter";
import { getFeaturedProducts, getProducts } from "@/lib/products";

export default async function Home() {
  const [featured, all] = await Promise.all([
    getFeaturedProducts(),
    getProducts(),
  ]);

  // Category tiles built from the live catalogue — first image per category as
  // the cover, and a real count so the rail reads as an archive, not chrome.
  const byCategory = new Map<string, { image: string; count: number }>();
  for (const p of all) {
    const entry = byCategory.get(p.category) ?? {
      image: p.images[0] ?? "/images/nostalgia.jpg",
      count: 0,
    };
    entry.count += 1;
    byCategory.set(p.category, entry);
  }
  const tiles: CategoryTile[] = [...byCategory.entries()]
    .slice(0, 6)
    .map(([name, v]) => ({
      name,
      href: `/shop?category=${encodeURIComponent(name)}`,
      image: v.image,
      count: v.count,
    }));

  return (
    <main id="top">
      <Hero />
      <Marquee />

      <TrustStrip />

      <CategoryTiles tiles={tiles} />

      {/* ── THE CAMPAIGN — the wordmark laid straight across the image at scale ── */}
      <section className="container-x reveal py-24 md:py-32">
        <p className="kicker">The campaign</p>
        <h2 className="mt-6 max-w-2xl font-serif font-normal leading-[1.02] tracking-[-0.02em] text-[clamp(2rem,5vw,3.75rem)]">
          The photograph is the container.
        </h2>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">
          No badge, no box. The wordmark is laid straight across the image at
          scale — the registered mark the only ornament. It is how every cover,
          ad, and storefront hero is built.
        </p>

        <figure className="relative mt-12 aspect-[16/9] overflow-hidden rounded-[4px]">
          {/* Portrait source in a 16/9 frame — held high so the crop lands on
              the tailoring and the printed dress rather than the hems. */}
          <Image
            src="/images/nostalgia.jpg"
            alt="Autumn archive campaign"
            fill
            sizes="100vw"
            className="object-cover object-[center_30%]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-shade/85 via-shade/55 to-shade/85"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Wordmark className="text-light text-[clamp(2.25rem,9vw,6.5rem)]" />
          </div>
          <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between px-6 py-5 text-[11px] uppercase tracking-[0.28em] text-light/70">
            <span>Autumn archive — 2026</span>
            <span>One of one</span>
          </figcaption>
        </figure>
      </section>

      {/* ── THE EDIT — the live archive, scrolled rather than gridded ── */}
      <section className="container-x reveal pb-24 md:pb-32">
        <div className="flex flex-wrap items-end justify-between gap-6 pb-10">
          <div>
            <p className="kicker">The edit</p>
            <h2 className="mt-6 font-serif font-normal leading-[1.02] tracking-[-0.02em] text-[clamp(2rem,5vw,3.75rem)]">
              In the archive now.
            </h2>
          </div>
          <Link
            href="/shop"
            className="link-underline pb-2 text-[13px] tracking-[0.01em] text-ink-soft hover:text-ink"
          >
            Shop the archive
          </Link>
        </div>

        <EditRail products={featured} />
      </section>

      {/* ── THE DEVICE — half photograph, half present tense ── */}
      <section className="container-x reveal pb-24 md:pb-32">
        <p className="kicker">The device</p>
        <h2 className="mt-6 max-w-2xl font-serif font-normal leading-[1.02] tracking-[-0.02em] text-[clamp(2rem,5vw,3.75rem)]">
          Half photograph, half present tense.
        </h2>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">
          The wordmark straddles the join between a cropped image and flat
          black — past and present held in one frame. The repeatable device
          across covers, drops, and the storefront.
        </p>

        <div className="relative mt-12 grid aspect-[16/9] grid-cols-2 overflow-hidden rounded-[4px]">
          <div className="relative">
            <Image
              src="/images/lookbook.jpg"
              alt="Archive lookbook, cropped"
              fill
              sizes="50vw"
              className="object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-shade/35" />
          </div>
          <div className="bg-shade" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Wordmark className="text-light text-[clamp(2.25rem,9vw,6.5rem)]" />
          </div>
        </div>
      </section>

      <Newsletter />

      {/* ── THE IDENTITY — the closing statement. No fixed black band here:
          it sits on the page ground (`cream`/`ink`) so it follows the theme
          and hands off cleanly to the themed footer beneath it. ── */}
      <section className="reveal bg-cream text-ink">
        <div className="container-x py-24 text-center md:py-36">
          <p className="kicker">History in the making</p>
          <h2 className="mx-auto mt-8 max-w-4xl font-serif font-normal leading-[1.05] tracking-[-0.02em] text-[clamp(2.25rem,6vw,5rem)]">
            One wordmark, every place it lives.
          </h2>
          <p className="mx-auto mt-8 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Reversed on black, framed on white, shrunk to an avatar. The past as
            raw material — worn, resold, and carried forward.
          </p>
          <Link href="/shop" className="btn-primary mt-10">
            Enter the marketplace
          </Link>
        </div>
      </section>
    </main>
  );
}

