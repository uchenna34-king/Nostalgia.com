import Link from "next/link";
import Wordmark from "@/components/Wordmark";

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
 * The identity's reversed-on-black state, at full width. Uses the fixed
 * shade/light tokens rather than ink/cream so it stays black in BOTH themes —
 * the footer is a brand surface, not a themed one.
 */
export default function Footer() {
  return (
    <footer className="mt-28 bg-shade text-light">
      <div className="container-x py-16 md:py-20">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <Link href="/" aria-label="Nostalgia — home">
            <Wordmark className="text-[1.7rem]" withLine />
          </Link>
          <Link
            href="#top"
            className="inline-flex items-center gap-2 rounded-full border border-light/25 px-5 py-2.5 text-[12px] font-medium tracking-[0.02em] text-light transition-colors hover:border-light/60"
          >
            Back to top
            <span aria-hidden>↑</span>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-sepia-light">
                {col.heading}
              </p>
              <ul className="mt-5 space-y-3 text-[13px] text-light/70">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="link-underline transition-colors hover:text-light"
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

      <div className="border-t border-light/12">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-[12px] text-light/55 sm:flex-row">
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
