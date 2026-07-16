"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

/**
 * Debounced (~300ms, D-02) search input driving `?q=`. Uncontrolled
 * (`defaultValue`) so a shared/bookmarked URL renders the term without
 * fighting keystroke state; on change it always resets `?page=1` (Pitfall 5).
 * Reads `useSearchParams`, so the page wraps this in <Suspense> (Pitfall 1).
 */
export default function SearchBox() {
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (term) params.set("q", term);
    else params.delete("q");
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <input
      // Keyed off the URL's `q` param so this uncontrolled input remounts
      // (and reapplies `defaultValue`) when `q` changes externally — e.g.
      // FilterPanel's "Clear filters" removing `?q=` — instead of leaving a
      // stale search term visible after the query has actually been cleared.
      key={searchParams.get("q") ?? "none"}
      type="text"
      placeholder="Search the collection..."
      defaultValue={searchParams.get("q") ?? ""}
      onChange={(e) => handleSearch(e.target.value)}
      aria-label="Search products"
      className="w-full border border-ink/25 bg-cream px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-sepia"
    />
  );
}
