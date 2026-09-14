import Image from "next/image";
import Link from "next/link";

export type CategoryTile = {
  name: string;
  href: string;
  image: string;
  count: number;
};

/**
 * "Shop by category" — MOVE's category rail, in the archive's photographic
 * treatment: each tile is a darkened image with the category set in the light
 * wordmark register and a count so it reads as a real archive, not decoration.
 * Same shade/light scrim as the campaign panels so a busy photo never fights
 * the label.
 */
export default function CategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  if (tiles.length === 0) return null;

  return (
    <section className="container-x reveal py-20 md:py-28">
      <div className="flex flex-wrap items-end justify-between gap-6 pb-10">
        <div>
          <p className="kicker">Shop by category</p>
          <h2 className="mt-6 font-serif font-normal leading-[1.02] tracking-[-0.02em] text-[clamp(2rem,5vw,3.75rem)]">
            Enter the archive.
          </h2>
        </div>
        <Link
          href="/shop"
          className="link-underline pb-2 text-[13px] tracking-[0.01em] text-ink-soft hover:text-ink"
        >
          Everything
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {tiles.map((tile, i) => (
          <Link
            key={tile.name}
            href={tile.href}
            className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[4px]"
          >
            <Image
              src={tile.image}
              alt={tile.name}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="-z-10 object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
              priority={i < 3}
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-t from-shade/90 via-shade/25 to-shade/10 transition-opacity duration-500 group-hover:from-shade/95"
            />
            <div className="flex items-end justify-between gap-3 p-5 md:p-6">
              <div>
                <h3 className="font-serif text-[clamp(1.35rem,2.4vw,2rem)] font-normal leading-none tracking-[-0.01em] text-light">
                  {tile.name}
                </h3>
                <p className="mt-2 text-[10.5px] uppercase tracking-[0.24em] text-light/60">
                  {tile.count} {tile.count === 1 ? "piece" : "pieces"}
                </p>
              </div>
              <span
                aria-hidden
                className="mb-1 shrink-0 translate-y-0 text-light/70 transition-transform duration-300 group-hover:translate-x-1"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
