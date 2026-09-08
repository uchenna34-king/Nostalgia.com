import Image from "next/image";
import Link from "next/link";

/**
 * Opening frame. Full-viewport photography with the display type set at
 * poster scale — the collision of an editorial serif with that scale is the
 * point: neither the athletic sans of sportswear nor the timid centered
 * wordmark of quiet luxury.
 *
 * Type is fluid via clamp() rather than breakpoint steps, so it fills the
 * frame identically at 320px and 2560px with no jump and no overflow.
 */
export default function Hero() {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden">
      <Image
        src="/images/hero.jpg"
        alt="A record shop in warm afternoon light"
        fill
        priority
        sizes="100vw"
        className="drift -z-10 object-cover object-[64%_center]"
      />

      {/* Floor scrim carries the type. Held to the lower two-thirds and eased
          so the photograph still owns the top of the frame — a full-height
          wash flattens the image to paper on short viewports. */}
      {/* The scrim is the page surface, so it inverts with the theme — which is
          right (light type needs a dark ground) but not at the same strength.
          Cream over a photo tints it; near-black over the same photo erases it,
          so both washes are pulled back in dark mode to the minimum the display
          type actually needs. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-cream via-cream/60 to-transparent dark:from-cream/85 dark:via-cream/35"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-cream/60 via-transparent to-transparent md:block dark:from-cream/30"
      />

      {/* Index rail — chapter and place as real information, set in the
          technical register against the warmth of the photograph. */}
      {/* Dropped entirely on very short viewports (landscape phones), where it
          would otherwise collide with the display type rather than frame it. */}
      <div className="container-x absolute inset-x-0 top-0 hidden items-baseline justify-between pt-20 text-[11px] uppercase tracking-[0.32em] text-ink-soft [@media(min-height:620px)]:flex sm:pt-24">
        <span>Chapter 04</span>
        <span className="hidden tabular-nums sm:block">45°31′N / 122°40′W</span>
      </div>

      <div className="container-x relative pb-16 md:pb-24">
        {/* Sized against BOTH axes: min(vw, vh) means a landscape phone or a
            short laptop window scales the display down instead of overflowing
            the frame and colliding with the index rail above it. */}
        <h1 className="font-serif font-normal leading-[0.82] tracking-[-0.035em] text-[clamp(2.75rem,min(12.5vw,17vh),11rem)]">
          <span className="block">Made for</span>
          <span className="block pl-[0.05em] italic text-sepia-deep">
            the long way
          </span>
          <span className="block">home.</span>
        </h1>

        <div className="mt-10 flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-sm text-base leading-relaxed text-ink-soft">
            A new collection of familiar shapes, washed by light and made to
            collect a little history.
          </p>

          <Link href="/shop" className="btn-glass-ink w-fit shrink-0">
            Explore Chapter 04
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
