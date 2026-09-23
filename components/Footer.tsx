import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import PaymentMarks from "@/components/PaymentMarks";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Shop",
    links: [
      { label: "Archive", href: "/shop" },
      { label: "New arrivals", href: "/shop?sort=new" },
      { label: "One of one", href: "/shop?category=Outerwear" },
      { label: "Collections", href: "/collections" },
    ],
  },
  {
    heading: "The House",
    links: [
      { label: "Our story", href: "/shop" },
      { label: "Authentication", href: "/shop" },
      { label: "Journal", href: "/shop" },
      { label: "Careers", href: "/shop" },
    ],
  },
  {
    heading: "Sell",
    links: [
      { label: "List an item", href: "/account" },
      { label: "Consignment", href: "/account" },
      { label: "Seller guide", href: "/account" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Help centre", href: "/shipping" },
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "Contact", href: "/shipping" },
    ],
  },
];

/**
 * The footer sits on the PAGE GROUND and follows the theme: `cream` is
 * #FFFFFF in light and #000000 in dark, with `ink` as the content colour
 * inverting alongside it — the same pair every other themed section uses, so
 * the footer is never a different shade from the page above it in either
 * mode. (It was briefly on `cream-dark`, the raised #F5F5F5/#141414 surface,
 * which in dark mode read as an off-black block sitting on true black; the
 * owner asked for it to match the rest of the page instead.)
 *
 * It deliberately does NOT use the fixed `shade`/`light` tokens. Those two
 * never change between themes, which is right for surfaces that are always a
 * black band — the announcement bar, the marquee, captions sitting on
 * photography — but wrong here: a permanently black footer under a white page
 * is fine, while the same black footer under an already-black dark-mode page
 * loses the edge between page and footer entirely.
 *
 * Hierarchy inside the footer comes from case and tracking, not from colour:
 * the column headings and their links share one tone (`ink-soft`) exactly as
 * they did on the old black ground, and links resolve to full `ink` on hover.
 *
 * Because the footer ground now equals the page ground, the top hairline is
 * the ONLY thing marking where the page ends and the footer begins. Keep it.
 */
export default function Footer() {
  return (
    <footer className="mt-20 border-t border-ink/12 bg-cream text-ink">
      <div className="container-x py-20 md:py-28">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <Link href="/" aria-label="Nostalgia — home">
            <Wordmark className="text-[1.7rem]" withLine />
          </Link>
          <Link
            href="#top"
            className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-5 py-2.5 text-[12px] font-medium tracking-[0.02em] text-ink transition-colors hover:border-ink/60"
          >
            Back to top
            <span aria-hidden>↑</span>
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-x-8 gap-y-14 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-sepia-deep">
                {col.heading}
              </p>
              <ul className="mt-6 space-y-3.5 text-[13.5px] text-ink-soft">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="link-underline transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Payment row — the real network marks, monochrome so the footer stays
          one material (see components/PaymentMarks.tsx for why they are not
          full-colour). The bordered chips that used to sit here existed only
          to give the *text* labels a container; drawn marks read cleanly on
          the bare ground and drop a stray 3px radius the system doesn't use. */}
      <div className="border-t border-ink/12">
        <div className="container-x py-6">
          <PaymentMarks />
        </div>
      </div>

      <div className="border-t border-ink/12">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-7 text-[12.5px] text-ink-soft sm:flex-row">
          <span>
            © {new Date().getFullYear()} Nostalgia®. A combination of the past
            and the present with the future.
          </span>
          <span className="tracking-[0.04em]">
            Terms · Privacy · nostalgia.com
          </span>
        </div>
      </div>
    </footer>
  );
}
