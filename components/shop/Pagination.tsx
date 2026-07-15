"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Builds an href for a given page, preserving every other URL param. */
function pageHref(pathname: string, searchParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(searchParams);
  params.set("page", String(page));
  return `${pathname}?${params.toString()}`;
}

/** Condenses a page list to first/last/current±1 with ellipses between gaps. */
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  const pages = new Set<number>([1, total]);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

/**
 * Numbered pagination reading/writing `?page=` (D-07). Hides entirely at
 * <=1 page; every link preserves all other params. Reads `useSearchParams`,
 * so the page wraps this in <Suspense> (Pitfall 1).
 */
export default function Pagination({ totalPages }: { totalPages: number }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  if (totalPages <= 1) return null;

  const page = Math.min(Math.max(1, Number(searchParams.get("page")) || 1), totalPages);
  const pages = getPageNumbers(page, totalPages);
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <nav aria-label="Pagination" className="mt-14 flex flex-wrap items-center justify-center gap-2">
      <Link
        href={isFirst ? "#" : pageHref(pathname, searchParams, page - 1)}
        aria-disabled={isFirst}
        tabIndex={isFirst ? -1 : undefined}
        className={`border px-3 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${
          isFirst
            ? "pointer-events-none border-ink/10 text-ink-soft/40"
            : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink"
        }`}
      >
        Prev
      </Link>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-ink-soft/50">
            &hellip;
          </span>
        ) : (
          <Link
            key={p}
            href={pageHref(pathname, searchParams, p)}
            aria-current={p === page ? "page" : undefined}
            className={`min-w-9 border px-3 py-2 text-center text-xs uppercase tracking-[0.18em] transition-colors ${
              p === page
                ? "border-ink bg-ink text-cream"
                : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink"
            }`}
          >
            {p}
          </Link>
        ),
      )}

      <Link
        href={isLast ? "#" : pageHref(pathname, searchParams, page + 1)}
        aria-disabled={isLast}
        tabIndex={isLast ? -1 : undefined}
        className={`border px-3 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${
          isLast
            ? "pointer-events-none border-ink/10 text-ink-soft/40"
            : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink"
        }`}
      >
        Next
      </Link>
    </nav>
  );
}
