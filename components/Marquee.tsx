const PHRASES = [
  "Keep what moves you",
  "Small batches",
  "Considered pieces",
  "Made for the long way home",
];

export default function Marquee() {
  const strip = [...PHRASES, ...PHRASES];
  return (
    <div className="overflow-hidden border-y border-ink/12 bg-ink py-3 text-cream">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {strip.map((p, i) => (
          <span
            key={i}
            className="mx-7 text-[11px] uppercase tracking-[0.32em] text-cream/85"
          >
            {p}
            <span aria-hidden className="mx-3 text-sepia-light">
              /
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
