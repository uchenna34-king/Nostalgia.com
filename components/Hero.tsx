"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/**
 * The opening stage. The wordmark IS the campaign — the word laid straight
 * across the photograph at poster scale — so this section is sized as a stage
 * you step into (min-h 92svh) rather than the short banner it used to be. At
 * py-24 the photograph was a squeezed strip with the whole lockup crammed into
 * it; the height is what lets the image and the word both have room.
 *
 * THE SCRIM IS LOAD-BEARING, NOT DECORATION. This type was previously set in
 * fixed `shade` (#000000) over a bare photograph, on the reasoning that the
 * shot has "a pale sky" so black would hold in both themes. The shot does not:
 * pixels.jpg is a storm sky that runs from roughly #b0b0b0 at the top to
 * #5a5a5a low in the frame, over a near-black roof edge, and the desktop crop
 * (object-cover on a portrait source) lands squarely on the darkest part —
 * black type on a dark photograph, which is exactly what it looked like.
 *
 * So the treatment is inverted to the one the house style sheet already
 * specified (the Contrast Rule: Bodoni over a photograph gets a heavy scrim):
 * a flat 45% base for an even floor, plus a vertical gradient that sculpts —
 * heavier at the top where the sky is brightest and it tucks under the glass
 * nav, heaviest at the bottom under the controls, lightest through the middle
 * where the figure already carries the dark. Worst case (white on the
 * brightest patch of sky under the thinnest part of the scrim) lands near
 * 4.6:1, so every tier clears AA rather than only the display line.
 *
 * Every colour here is a FIXED token (`light`, `shade`), never the themed
 * `ink`/`cream` pair. The photograph does not change when the theme does, so
 * type that reads against the photograph must not change either — the old
 * buttons inherited `bg-ink`/`text-ink` and flipped black-to-white over an
 * unchanging image, which broke them in whichever mode you weren't testing.
 *
 * The word is one accessible string via aria-label; the split into two spans
 * is purely visual, so screen readers hear "Nostalgia", not "N … ostalgia".
 */
export default function Hero() {
  const [take, setTake] = useState(0);

  return (
    <section className="relative isolate flex min-h-[92svh] flex-col overflow-hidden bg-shade">
      {/* object-[center_38%] holds the crop on the figure and the open sky
          above it. On a portrait source in a landscape frame, plain
          object-center cuts to the hips. `drift` is the one authored entrance
          on the page — a 2.4s settle out of a 1.09 scale, so the image lands
          rather than appears. */}
      <Image
        src="/images/pixels.jpg"
        alt="A dancer mid-movement in ochre against an open storm sky — the autumn archive campaign"
        fill
        priority
        sizes="100vw"
        className="drift -z-20 object-cover object-[center_38%]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-shade/45" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-shade/75 via-shade/25 to-shade/85"
      />

      <div className="container-x flex flex-1 flex-col items-center justify-center py-28 text-center md:py-32">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-light/75">
          A luxury resale house · Est. 2025
        </p>

        {/* key remounts the lockup so the reveal restarts from the top. */}
        <h1
          key={take}
          aria-label="Nostalgia"
          className="mt-8 font-serif font-normal leading-none tracking-[-0.015em] text-light text-[clamp(3.25rem,15vw,10rem)] md:mt-10"
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

        <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.3em] text-light/75">
          History in the making
        </p>

        <p className="mt-9 max-w-[52ch] text-[16px] leading-[1.75] text-light/90">
          The past as raw material. A marketplace where one-of-one archive
          fashion meets the collectors, the enthusiasts, and the next generation
          discovering it for the first time.
        </p>

        {/* Fixed-token controls. The primary is a solid light pill — the only
            fully opaque thing on the image, so it reads as the one action —
            and the secondary is the house glass control, which is already
            built to sit on darkened photography in both themes. */}
        <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-full bg-light px-8 py-4 text-xs font-medium uppercase tracking-[0.2em] text-shade transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-10px_rgb(0_0_0_/_0.65)] active:translate-y-0 motion-reduce:transform-none"
          >
            Enter the marketplace
          </Link>
          <Link href="/account" className="btn-glass">
            Sell with us
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setTake((t) => t + 1)}
          className="link-underline mt-10 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-light/65 transition-colors hover:text-light"
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

      {/* Scroll cue. The stage is a full viewport, so the page needs to say
          out loud that it continues below the fold. Decorative and hidden from
          assistive tech — the content beneath is reachable without it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center"
      >
        <span className="h-10 w-px origin-top animate-[scroll-cue_2.6s_cubic-bezier(0.16,1,0.3,1)_infinite] bg-gradient-to-b from-transparent to-light/70" />
      </div>
    </section>
  );
}
