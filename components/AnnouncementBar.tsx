/**
 * Slim top strip above the nav — the archive's version of MOVE's promo bar, but
 * quiet: no accent colour, just the house facts set small and letterspaced.
 * Always black (shade/light) so it reads as a printed band in both themes.
 */
const ITEMS = [
  "Complimentary insured shipping over $200",
  "Every piece authenticated",
  "30-day returns",
];

export default function AnnouncementBar() {
  return (
    <div className="bg-shade text-light/80">
      <div className="container-x flex h-9 items-center justify-center gap-6 overflow-hidden text-[10.5px] uppercase tracking-[0.24em] whitespace-nowrap">
        {ITEMS.map((item, i) => (
          <span key={item} className="flex items-center gap-6">
            {i > 0 && (
              <span aria-hidden className="text-light/30">
                ✦
              </span>
            )}
            <span className={i === 0 ? "" : "hidden sm:inline"}>{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
