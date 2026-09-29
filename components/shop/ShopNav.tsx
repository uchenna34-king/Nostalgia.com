import Link from "next/link";
import {
  CATEGORIES,
  DEPARTMENTS,
  shopHref,
  type ShopLocation,
} from "@/lib/taxonomy";

/**
 * Wayfinding for /shop, in the order a shopper reads it: where am I
 * (breadcrumb), which department (tabs), what is next to me (chips), and the
 * whole department at a glance (tree, desktop only). All server-rendered links —
 * moving through the tree is navigation, not filtering, so every place has its
 * own URL, title and back-button entry.
 *
 * Moving to a new place keeps only `?sort=`. Size and price are per-place
 * choices: a shoe size means nothing on the jeans page.
 */

function carry(sort: string | undefined): string {
  return sort ? `?sort=${encodeURIComponent(sort)}` : "";
}

export function Breadcrumbs({ loc }: { loc: ShopLocation }) {
  const { department: d, category: c, section: s } = loc;
  const crumbs: { label: string; href?: string }[] = [
    { label: "Shop", href: "/shop" },
  ];
  if (d) crumbs.push({ label: d.label, href: shopHref(d.slug) });
  if (d && c) crumbs.push({ label: c.label, href: shopHref(d.slug, c.slug) });
  if (d && c && s) crumbs.push({ label: s.label });
  // The last crumb is the current page: plain text, not a link to itself.
  const last = crumbs[crumbs.length - 1];
  delete last.href;

  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-x-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
        {crumbs.map((cr, i) => (
          <li key={cr.label} className="flex items-center gap-x-2">
            {i > 0 && <span aria-hidden>/</span>}
            {cr.href ? (
              <Link href={cr.href} className="link-underline hover:text-ink">
                {cr.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {cr.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Women | Men — the first split, as on ASOS and SSENSE. Switching department
 * keeps the category and section, so "Running" on Men flips straight to
 * "Running" on Women.
 */
export function DepartmentTabs({
  loc,
  sort,
}: {
  loc: ShopLocation;
  sort?: string;
}) {
  const tabs = [
    { key: "all", label: "All", href: "/shop", active: !loc.department },
    ...DEPARTMENTS.map((d) => ({
      key: d.slug,
      label: d.label,
      href: shopHref(d.slug, loc.category?.slug, loc.section?.slug),
      active: loc.department?.slug === d.slug,
    })),
  ];

  return (
    <nav aria-label="Department" className="mb-10 border-b border-ink/10">
      <ul className="-mb-px flex gap-8">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={`${t.href}${carry(sort)}`}
              aria-current={t.active ? "page" : undefined}
              className={`block border-b-2 pb-3 text-[13px] font-medium tracking-[0.01em] transition-colors ${
                t.active
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The row of places next to this one. Inside a category that has sections it
 * lists those sections ("All shoes", Running, Corporate, Canvas); everywhere
 * else it lists the categories. On /shop (no department) the chips filter by
 * category across both departments via the legacy `?category=` parameter.
 */
export function LocationChips({
  loc,
  sort,
  legacyCategory,
}: {
  loc: ShopLocation;
  sort?: string;
  legacyCategory?: string;
}) {
  const { department: d, category: c, section: s } = loc;
  let chips: { key: string; label: string; href: string; active: boolean }[];

  if (d && c && c.sections.length) {
    chips = [
      {
        key: "all",
        label: `All ${c.label.toLowerCase()}`,
        href: shopHref(d.slug, c.slug) + carry(sort),
        active: !s,
      },
      ...c.sections.map((sec) => ({
        key: sec.slug,
        label: sec.label,
        href: shopHref(d.slug, c.slug, sec.slug) + carry(sort),
        active: s?.slug === sec.slug,
      })),
    ];
  } else if (d) {
    chips = [
      {
        key: "all",
        label: "All",
        href: shopHref(d.slug) + carry(sort),
        active: !c,
      },
      ...CATEGORIES.map((cat) => ({
        key: cat.slug,
        label: cat.label,
        href: shopHref(d.slug, cat.slug) + carry(sort),
        active: c?.slug === cat.slug,
      })),
    ];
  } else {
    const q = (label?: string) => {
      const p = new URLSearchParams();
      if (label) p.set("category", label);
      if (sort) p.set("sort", sort);
      const qs = p.toString();
      return qs ? `/shop?${qs}` : "/shop";
    };
    chips = [
      { key: "all", label: "All", href: q(), active: !legacyCategory },
      ...CATEGORIES.map((cat) => ({
        key: cat.slug,
        label: cat.label,
        href: q(cat.label),
        active: legacyCategory === cat.label,
      })),
    ];
  }

  return (
    <nav
      aria-label={c && c.sections.length ? `${c.label} sections` : "Categories"}
    >
      {/* Scrolls sideways on phones rather than wrapping into a tall block that
          pushes the grid below the fold. */}
      <ul className="no-scrollbar -mx-6 mb-8 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map((chip) => (
          <li key={chip.key} className="shrink-0">
            <Link
              href={chip.href}
              aria-current={chip.active ? "page" : undefined}
              className={`block rounded-full border px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${
                chip.active
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/20 text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {chip.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The department's whole tree in the sidebar (desktop), SSENSE-style: every
 * category listed, the current one opened to show its sections. On /shop it
 * lists both departments' categories.
 */
export function CategoryTree({
  loc,
  sort,
}: {
  loc: ShopLocation;
  sort?: string;
}) {
  const depts = loc.department ? [loc.department] : DEPARTMENTS;

  return (
    <nav aria-label="Shop by category" className="space-y-8">
      {depts.map((d) => (
        <div key={d.slug}>
          <p className="eyebrow mb-3">{d.label}</p>
          <ul className="space-y-1.5">
            {CATEGORIES.map((cat) => {
              const open =
                loc.department?.slug === d.slug &&
                loc.category?.slug === cat.slug;
              const here = open && !loc.section;
              return (
                <li key={cat.slug}>
                  <Link
                    href={shopHref(d.slug, cat.slug) + carry(sort)}
                    aria-current={here ? "page" : undefined}
                    className={`text-sm transition-colors ${
                      open
                        ? "font-medium text-ink"
                        : "text-ink-soft hover:text-ink"
                    } ${here ? "underline decoration-sepia decoration-2 underline-offset-4" : ""}`}
                  >
                    {cat.label}
                  </Link>
                  {open && cat.sections.length > 0 && (
                    <ul className="mb-2 mt-2 space-y-1.5 border-l border-ink/15 pl-4">
                      {cat.sections.map((sec) => {
                        const active = loc.section?.slug === sec.slug;
                        return (
                          <li key={sec.slug}>
                            <Link
                              href={
                                shopHref(d.slug, cat.slug, sec.slug) +
                                carry(sort)
                              }
                              aria-current={active ? "page" : undefined}
                              className={`text-sm transition-colors ${
                                active
                                  ? "font-medium text-ink underline decoration-sepia decoration-2 underline-offset-4"
                                  : "text-ink-soft hover:text-ink"
                              }`}
                            >
                              {sec.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
