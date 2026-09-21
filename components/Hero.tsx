"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/**
 * The opening reveal, laid over the campaign photograph. The wordmark IS the
 * campaign — the word laid straight across the image at poster scale. It plays
 * automatically on load in two beats: the N stands alone, then the rest of the
 * letters unfurl out of it (see .reveal-n / .reveal-rest in globals.css).
 * "Replay the reveal" re-triggers it; the lockup is keyed so remounting
 * restarts the CSS clocks cleanly from the first frame.
 *
 * The photograph is scaled to fill the section (object-cover) with no wash or
 * scrim over it, and it is the SAME photo in both themes. The type is
 * therefore set in the fixed `shade` token (#000000 in both modes), not the
 * themed `ink`: the thing the type has to read against is the image, not the
 * page ground, and the image doesn't change when the theme does. This shot
 * has a pale sky, so black type is the one that holds up in both modes —
 * white type in dark mode disappeared into it. If the campaign image is ever
 * swapped for a dark one, flip this to `light` (fixed white) for the same
 * reason.
 *
 * The word is one accessible string via aria-label; the split into two spans is
 * purely visual, so screen readers hear "Nostalgia", not "N … ostalgia".
 */
export default function Hero() {
  const [take, setTake] = useState(0);

  return (
    <section className="relative isolate overflow-hidden bg-cream">
      <Image
        src="/images/pixels.jpg"
        alt="Two models under a sheet of plastic against an open sky — the autumn archive campaign"
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-center"
      />

      <div className="container-x flex flex-col items-center py-24 text-center md:py-32">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-shade">
          A luxury resale house · Est.2025
        </p>

        {/* key remounts the lockup so the reveal restarts from the top. */}
        <h1
          key={take}
          aria-label="Nostalgia"
          className="mt-10 font-serif font-normal leading-none tracking-[-0.015em] text-shade text-[clamp(3.25rem,15vw,10rem)] md:mt-12"
        >
          <span aria-hidden className="reveal-n">
            N
          </span>
          <span aria-hidden className="reveal-rest">
            ostalgia
            <sup className="ml-[0.08em] align-top text-[0.32em] tracking-normal">
              ®
            </sup>
          </span>
        </h1>

        <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.28em] text-shade">
          History in the making
        </p>

        <p className="mt-8 max-w-md text-[15px] leading-relaxed text-shade">
          The past as raw material. A marketplace where one-of-one archive
          fashion meets the collectors, the enthusiasts, and the next generation
          discovering it for the first time.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/shop"
            className="btn-primary"
          >
            Enter the marketplace
          </Link>
          <Link
            href="/account"
            className="btn-outline"
          >
            Sell with us
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setTake((t) => t + 1)}
          className="link-underline mt-9 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-shade/70 transition-colors hover:text-shade"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" />
          </svg>
          Replay the reveal
        </button>
      </div>
    </section>
  );
}
