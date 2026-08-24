// Pure catalog query-param -> Prisma query-piece builders (DISC-01/02/03, CATL-01).
//
// This module MUST stay free of any Prisma client / database import so it is
// unit-testable without a DB or browser (see 08-RESEARCH.md Validation Architecture).
// It may import `Prisma` as a *type* for return-type annotations only.
import type { Prisma } from "@prisma/client";

/** Products per page (D-07: "e.g. 24"). */
export const PAGE_SIZE = 24;

/** Allow-list of sort keys accepted from the URL (`?sort=`) — never pass an
 * arbitrary string into Prisma's `orderBy` (ASVS V5 / T-08-02). */
export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name" },
  { value: "newest", label: "Newest" },
];

const MAX_PAGE = 100000;

/**
 * Coerces an untrusted `?page=` value into a positive integer, clamped to a
 * sane upper bound. Never throws; never returns <= 0 or a non-integer.
 */
export function parsePage(raw: string | number | undefined): number {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_PAGE);
}

export type PriceRange = { minPrice?: number; maxPrice?: number };

/**
 * Coerces an untrusted `?price=` value (e.g. "5000-20000", "5000-", "-20000")
 * into a { minPrice?, maxPrice? } pair. Malformed or negative input is
 * ignored (returns {}) rather than thrown.
 */
export function parsePriceRange(raw: string | undefined): PriceRange {
  if (!raw) return {};
  const match = /^(\d+)?-(\d+)?$/.exec(raw.trim());
  if (!match) return {};
  const [, minStr, maxStr] = match;
  const result: PriceRange = {};
  if (minStr) {
    // Only set if non-empty — Number("") === 0 would incorrectly add a minPrice:0 clause.
    const min = Number(minStr);
    if (Number.isFinite(min) && min >= 0) result.minPrice = min;
  }
  if (maxStr !== undefined) {
    const max = Number(maxStr);
    if (Number.isFinite(max) && max >= 0) result.maxPrice = max;
  }
  // Guard against an inverted range (e.g. `?price=20000-5000`), which would
  // otherwise silently produce an impossible `price >= 20000 AND price <=
  // 5000` where clause and zero results with no indication anything was
  // wrong with the input.
  if (
    result.minPrice !== undefined &&
    result.maxPrice !== undefined &&
    result.minPrice > result.maxPrice
  ) {
    [result.minPrice, result.maxPrice] = [result.maxPrice, result.minPrice];
  }
  return result;
}

export type CatalogFilterParams = {
  q?: string;
  category?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  collection?: string;
};

/**
 * Builds a Prisma `Product.where` clause from untrusted URL params. Search is
 * an OR across name/description/category; all other filters AND together.
 *
 * Stock (D-09): every query carries an always-on `inStockClause`
 * (`variants: { some: { stock: { gt: 0 } } }`), so a fully-sold-out product is
 * hidden from `/shop` AND every collection listing. The `?size=` filter is
 * likewise stock-aware — it matches only products offering that size in stock —
 * via the relational `ProductSizeStock` table (replacing the old SQLite JSON
 * quote-guard string match on the `sizes` column).
 *
 * SQLite-only workaround still isolated here (revisit at the Phase 11 Postgres
 * migration): `contains` search is case-sensitive on SQLite (no
 * `mode: "insensitive"`, which is Postgres/MongoDB-only and unsupported here).
 */
export function buildProductWhere(
  params: CatalogFilterParams,
): Prisma.ProductWhereInput {
  const { q, category, size, minPrice, maxPrice, collection } = params;

  const searchClause: Prisma.ProductWhereInput = q
    ? {
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { category: { contains: q } },
        ],
      }
    : {};

  const categoryClause: Prisma.ProductWhereInput =
    category && category !== "All" ? { category } : {};

  // Stock-aware, relational size filter (D-09): a `?size=M` filter returns only
  // products that offer M *in stock*. Replaces the old SQLite JSON quote-guard
  // string match against the `sizes` column. (To later mean "offers M
  // regardless of stock", drop the inner `stock` filter — a one-line change.)
  const sizeClause: Prisma.ProductWhereInput = size
    ? { variants: { some: { size, stock: { gt: 0 } } } }
    : {};

  // Always-on: hide any product whose every size is 0 (D-09). `some: stock > 0`
  // (not `none`) also excludes a malformed product with zero variant rows.
  const inStockClause: Prisma.ProductWhereInput = {
    variants: { some: { stock: { gt: 0 } } },
  };

  const minPriceClause: Prisma.ProductWhereInput =
    minPrice !== undefined ? { price: { gte: minPrice } } : {};

  const maxPriceClause: Prisma.ProductWhereInput =
    maxPrice !== undefined ? { price: { lte: maxPrice } } : {};

  const collectionClause: Prisma.ProductWhereInput = collection
    ? { collections: { some: { slug: collection } } }
    : {};

  return {
    AND: [
      searchClause,
      categoryClause,
      sizeClause,
      minPriceClause,
      maxPriceClause,
      collectionClause,
      inStockClause,
    ],
  };
}

const SORT_VALUES = new Set(SORT_OPTIONS.map((o) => o.value));

/**
 * Maps a `?sort=` value to a Prisma `orderBy` object via a strict allow-list.
 * Any unknown/absent/malicious value falls back to "newest" — never passes
 * an arbitrary string into Prisma's orderBy field selection (ASVS V5).
 */
export function buildOrderBy(
  sort: string | undefined,
): Prisma.ProductOrderByWithRelationInput {
  const key = sort && SORT_VALUES.has(sort) ? sort : "newest";
  switch (key) {
    case "price-asc":
      return { price: "asc" };
    case "price-desc":
      return { price: "desc" };
    case "name":
      return { name: "asc" };
    default:
      return { createdAt: "desc" };
  }
}

export type PaginationMeta = {
  totalPages: number;
  page: number;
  skip: number;
  take: number;
  hasPrev: boolean;
  hasNext: boolean;
};

/**
 * Computes pagination bounds from a total row count. Always returns a valid
 * clamp: totalPages is at least 1, and a page beyond the last page still
 * yields a finite, non-negative skip.
 */
export function paginationMeta(
  total: number,
  page: number,
  pageSize: number = PAGE_SIZE,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const skip = (clampedPage - 1) * pageSize;
  return {
    totalPages,
    page: clampedPage,
    skip,
    take: pageSize,
    hasPrev: clampedPage > 1,
    hasNext: clampedPage < totalPages,
  };
}
