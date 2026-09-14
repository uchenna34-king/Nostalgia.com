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
}: {
  className?: string;
  /** Adds the "History in the making" line locked under the word. */
  withLine?: boolean;
}) {
  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      <span className="font-serif font-normal leading-none tracking-[-0.015em]">
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
