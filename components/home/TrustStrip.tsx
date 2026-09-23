/**
 * The four-promise row, the way MOVE runs its "Free shipping / Easy returns /
 * Secure payment / Support" strip — re-cast for a resale house (authentication
 * is the real promise here) and drawn in one hairline weight, no colour.
 */
type Item = { title: string; note: string; icon: React.ReactNode };

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ITEMS: Item[] = [
  {
    title: "Authenticated",
    note: "Every piece verified by hand",
    icon: (
      <svg viewBox="0 0 24 24" {...S} className="h-6 w-6">
        <path d="M12 3l7 3v5c0 4.2-2.9 7.4-7 8.8C7.9 18.4 5 15.2 5 11V6l7-3Z" />
        <path d="M9.2 12l1.9 1.9L15 9.9" />
      </svg>
    ),
  },
  {
    title: "Insured shipping",
    note: "Complimentary over $200",
    icon: (
      <svg viewBox="0 0 24 24" {...S} className="h-6 w-6">
        <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17.5" cy="18" r="1.6" />
      </svg>
    ),
  },
  {
    title: "30-day returns",
    note: "Simple, on every order",
    icon: (
      <svg viewBox="0 0 24 24" {...S} className="h-6 w-6">
        <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" />
      </svg>
    ),
  },
  {
    title: "Concierge",
    note: "Real people, seven days",
    icon: (
      <svg viewBox="0 0 24 24" {...S} className="h-6 w-6">
        <path d="M5 12a7 7 0 0 1 14 0" />
        <path d="M3 13v3a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 1zM21 13v3a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 1z" />
      </svg>
    ),
  },
];

export default function TrustStrip() {
  return (
    <section className="border-y border-ink/10">
      {/* Two columns on phones, four from md. On a 360–375px phone each text
          column is only ~105–115px wide, so two things matter: the text
          wrapper must be allowed to shrink (`min-w-0` — flex items default to
          min-width:auto and would otherwise push a long word like
          "Authenticated" out of the cell instead of wrapping it), and the
          icon must top-align so a note that wraps to two lines doesn't drag
          it down. Gaps tighten on phones to buy the text a little more room. */}
      <div className="container-x grid grid-cols-2 gap-x-5 gap-y-10 py-14 sm:gap-x-8 sm:gap-y-12 sm:py-16 md:grid-cols-4 md:py-20">
        {ITEMS.map((item) => (
          <div key={item.title} className="flex items-start gap-3 sm:gap-4">
            <span className="mt-0.5 shrink-0 text-ink">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium tracking-[0.01em] text-ink">
                {item.title}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-[1.5] text-ink-soft">
                {item.note}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
