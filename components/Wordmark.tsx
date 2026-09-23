/**
 * The wordmark lockup. One component so the spec is enforced in every place it
 * lives (nav, footer, hero, avatar): Bodoni Moda 400, tracking -0.015em, the ®
 * raised to the cap line. Never set the word "Nostalgia" by hand elsewhere —
 * use this, so the registered mark and the tracking can never drift.
 *
 * Size is inherited from the parent's font-size (set `text-*` on the wrapper),
 * so the same lockup scales from a 20px nav mark to a poster-scale hero without
 * a variant prop.
 */
export default function Wordmark({
  className = "",
  withLine = false,
  opticalCenter = false,
}: {
  className?: string;
  /** Adds the "History in the making" line locked under the word. */
  withLine?: boolean;
  /**
   * Nudges the lockup right by half the ® advance. Only for CENTRED placements.
   *
   * The ® is a real glyph with real width, so centring the lockup's box leaves
   * the readable word sitting half the mark's width left of true centre — 3.6px
   * in the nav, 8px at hero scale, which is exactly enough to look like a
   * mistake. Compensating by `supW / 2` puts the WORD on the centre line and
   * lets the mark hang, which is what optical alignment means here.
   *
   * The value is in `em`, so one number is correct at every size the lockup is
   * ever set at. A `transform` rather than a margin on purpose: the hero nests
   * the mark inside an `overflow: hidden` reveal span, where a negative margin
   * would shrink the box and clip the ® clean off.
   *
   * Left-aligned placements (the footer) must NOT set this — there the mark
   * hanging past the text edge is correct, and shifting the word would break
   * its alignment with the columns beneath it.
   */
  opticalCenter?: boolean;
}) {
  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      <span
        className={`font-serif font-normal leading-none tracking-[-0.015em] ${
          opticalCenter ? "translate-x-[0.14em]" : ""
        }`}
      >
        Nostalgia
        <sup className="ml-[0.08em] align-top text-[0.32em] font-normal tracking-normal">
          ®
        </sup>
      </span>
      {withLine && (
        <span className="mt-[0.5em] text-[0.14em] font-medium uppercase tracking-[0.42em] text-sepia-deep">
          History in the making
        </span>
      )}
    </span>
  );
}
