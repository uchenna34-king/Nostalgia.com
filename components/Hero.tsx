"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * The opening reveal. Per the identity, the wordmark IS the campaign — the word
 * laid straight across warm off-white at poster scale. It plays automatically
 * on load in two beats: the N stands alone, then the rest of the letters unfurl
 * out of it (see .reveal-n / .reveal-rest in globals.css). "Replay the reveal"
 * re-triggers it; the lockup is keyed so remounting restarts the CSS clocks
 * cleanly from the first frame.
 *
 * The word is one accessible string via aria-label; the split into two spans is
 * purely visual, so screen readers hear "Nostalgia", not "N … ostalgia".
 */
export default function Hero() {
  const [take, setTake] = useState(0);

  return (
    <section className="relative overflow-hidden">
      <div className="container-x flex flex-col items-center py-24 text-center md:py-32">
        <p className="kicker">A luxury resale house · Est. now</p>

        {/* key remounts the lockup so the reveal restarts from the top. */}
        <h1
          key={take}
          aria-label="Nostalgia"
          className="mt-10 font-serif font-normal leading-none tracking-[-0.015em] text-[clamp(3.25rem,15vw,10rem)] md:mt-12"
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

        <p className="kicker mt-10">History in the making</p>

        <p className="mt-8 max-w-md text-[15px] leading-relaxed text-ink-soft">
          The past as raw material. A marketplace where one-of-one archive
          fashion meets the collectors, the enthusiasts, and the next generation
          discovering it for the first time.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/shop" className="btn-primary">
            Enter the marketplace
          </Link>
          <Link href="/account" className="btn-outline">
            Sell with us
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setTake((t) => t + 1)}
          className="link-underline mt-9 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-sepia-deep transition-colors hover:text-ink"
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
