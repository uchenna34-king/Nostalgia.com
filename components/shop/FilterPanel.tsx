"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORT_OPTIONS } from "@/lib/catalog";

/**
 * Size/price/sort filter controls (D-04), writing live to the URL on every
 * change with no Apply button (D-02) and always resetting `?page=1`
 * (Pitfall 5). Sidebar on desktop, collapsible panel on mobile (D-05). Reads
 * `useSearchParams`, so the page wraps this in <Suspense> (Pitfall 1).
 *
 * Where you are in the tree (department / category / section) is the URL path,
 * not a filter — see components/shop/ShopNav.tsx. `sizes` is the in-stock size
 * facet for that place, so shoes offer UK sizes and jeans offer waists.
 * `children` renders above the filters (the category tree on desktop).
 */
export default function FilterPanel({
  sizes,
  children,
}: {
  sizes: string[];
  children?: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeSize = searchParams.get("size") ?? "";
  const activeSort = searchParams.get("sort") ?? "newest";
  const priceParam = searchParams.get("price") ?? "";
  const [minPriceRaw, maxPriceRaw] = priceParam.split("-");
  // `key`ed off the URL's `price` param so these uncontrolled inputs remount
  // (and thus reapply `defaultValue`) whenever the price filter changes
  // externally — e.g. via clearFilters() — instead of silently keeping
  // stale text after the filter has been removed from the URL.
  const priceKey = priceParam || "none";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    replace(`${pathname}?${params.toString()}`);
  }

  function setPriceRange(min: string, max: string) {
    const params = new URLSearchParams(searchParams);
    if (min || max) params.set("price", `${min}-${max}`);
    else params.delete("price");
    params.set("page", "1");
    replace(`${pathname}?${params.toString()}`);
  }

  const hasActiveFilters = Boolean(
    searchParams.get("category") ||
    activeSize ||
    searchParams.get("price") ||
    searchParams.get("q"),
  );

  function clearFilters() {
    const params = new URLSearchParams(searchParams);
    params.delete("category");
    params.delete("size");
    params.delete("price");
    params.delete("q");
    params.set("page", "1");
    replace(`${pathname}?${params.toString()}`);
  }

  const body = (
    <div className="space-y-8">
      {sizes.length > 0 && (
        <div>
          <p className="eyebrow mb-3">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => setParam("size", activeSize === s ? null : s)}
                aria-pressed={activeSize === s}
                className={`min-w-11 border px-3 py-2 text-sm transition-colors ${
                  activeSize === s
                    ? "border-ink bg-ink text-cream"
                    : "border-ink/25 text-ink hover:border-ink"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow mb-3">Price</p>
        <div className="flex items-center gap-2">
          <input
            key={`min-${priceKey}`}
            type="number"
            min={0}
            placeholder="Min"
            defaultValue={minPriceRaw || ""}
            onBlur={(e) => setPriceRange(e.target.value, maxPriceRaw || "")}
            aria-label="Minimum price"
            className="w-full border border-ink/25 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-sepia"
          />
          <span className="text-ink-soft">&ndash;</span>
          <input
            key={`max-${priceKey}`}
            type="number"
            min={0}
            placeholder="Max"
            defaultValue={maxPriceRaw || ""}
            onBlur={(e) => setPriceRange(minPriceRaw || "", e.target.value)}
            aria-label="Maximum price"
            className="w-full border border-ink/25 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-sepia"
          />
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3">Sort by</p>
        {/* The "Sort by" <p> above is visual only — it is not programmatically
            associated, so screen readers announced this as an unlabelled combo
            box. aria-label matches the pattern used by the price inputs above. */}
        <select
          aria-label="Sort by"
          value={activeSort}
          onChange={(e) => setParam("sort", e.target.value)}
          className="w-full border border-ink/25 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-sepia"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-xs uppercase tracking-[0.18em] text-sepia underline underline-offset-4 hover:text-ink"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="mb-6 lg:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          className="w-full border border-ink/25 px-4 py-3 text-xs uppercase tracking-[0.18em] text-ink"
        >
          {mobileOpen ? "Hide filters" : "Filters & sort"}
        </button>
        {mobileOpen && <div className="mt-6">{body}</div>}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 space-y-12 lg:block">
        {children}
        {body}
      </aside>
    </>
  );
}
