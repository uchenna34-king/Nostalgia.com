const PHRASES = [
  "FREE SHIPPING OVER $200",
  "THE ARCHIVE DROP IS LIVE",
  "WEAR THE MEMORY",
  "HANDMADE IN LIMITED RUNS",
];

export default function Marquee() {
  const strip = [...PHRASES, ...PHRASES];
  return (
    <div className="overflow-hidden border-y border-ink/15 bg-ink py-2.5 text-cream">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {strip.map((p, i) => (
          <span
            key={i}
            className="mx-8 text-xs uppercase tracking-[0.3em] opacity-90"
          >
            {p} <span className="mx-4 text-sepia">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
