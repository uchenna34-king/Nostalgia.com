import Image from "next/image";
import Link from "next/link";

/**
 * Editorial full-bleed hero (redesign). Real photography (`/images/hero.jpg`,
 * an owner-supplied asset) carries the frame; a left-anchored cream scrim keeps
 * the ink display type ≥4.5:1 over the warm, light left third of the image.
 * The photo is the LCP element, so it is `priority` (eager).
 */
export default function Hero() {
  return (
    <section className="relative isolate flex min-h-[88vh] items-end overflow-hidden">
      <Image
        src="/images/hero.jpg"
        alt="A record shop in warm afternoon light — the long way home"
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-[62%_center] md:object-[70%_center]"
      />
      {/* Floor scrim (all sizes): keeps the photograph visible up top while the
          ink type at the bottom clears 4.5:1. On mobile this is the only scrim,
          so the record shop reads instead of washing to cream. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-cream via-cream/70 to-transparent"
      />
      {/* Left scrim (desktop only): supports the side-by-side reading where the
          type sits beside the model rather than beneath her. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-cream/85 via-cream/30 to-transparent md:block"
      />

      <div className="container-x w-full pb-16 pt-28 md:pb-24">
        <div className="animate-fade-up max-w-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-ink-soft">
            Nostalgia — Chapter 04
          </p>
          <h1 className="mt-6 font-serif text-6xl font-normal leading-[0.9] tracking-[-0.02em] text-ink sm:text-7xl lg:text-[7.5rem]">
            Made for
            <br />
            <span className="italic text-sepia-deep">the long way</span>
            <br />
            home.
          </h1>
          <p className="mt-7 max-w-md text-base leading-relaxed text-ink-soft">
            A new collection of familiar shapes, washed by light and made to
            collect a little history.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <Link href="/shop" className="btn-primary">
              Explore Chapter 04
            </Link>
            <span className="hidden text-xs uppercase tracking-[0.3em] text-ink-soft sm:inline">
              45° 31′ N / 122° 40′ W
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
