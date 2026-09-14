const PHRASES = [
  "One of one",
  "Authenticated archive",
  "History in the making",
  "The photograph is the container",
];

/**
 * A thin reversed strip between the reveal and the campaign — always black in
 * both themes (shade/light), so it reads as a printed rule across the page
 * rather than a themed band.
 */
export default function Marquee() {
  const strip = [...PHRASES, ...PHRASES];
  return (
    <div className="overflow-hidden bg-shade py-3 text-light">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {strip.map((p, i) => (
          <span
            key={i}
            className="mx-7 text-[11px] uppercase tracking-[0.32em] text-light/80"
          >
            {p}
            <span aria-hidden className="mx-3 text-light/35">
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
