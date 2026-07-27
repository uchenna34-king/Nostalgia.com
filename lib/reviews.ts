// Shared review query layer (TRST-01, D-01/D-03/D-04). The single source of
// truth for verified-purchase eligibility and aggregate ratings that every
// Phase 10 reviews surface (PDP read UI, review write action, admin moderation,
// SEO JSON-LD) consumes — so the on-page rating and structured-data
// aggregateRating can never disagree.
//
// Split like lib/products.ts: pure helpers stay Prisma-free (unit-testable
// under jsdom with no DB); only the async functions touch the database.
import { prisma } from "@/lib/db";
import { parseOrderItems } from "@/lib/orders";

// ---- Pure helpers (Prisma-free, directly unit-testable) ----

const RATINGS = new Set([1, 2, 3, 4, 5]);

/**
 * Explicit 1-5 allow-list (mirrors isValidOrderStatus / buildOrderBy). Accepts
 * only an integer that is a member of {1,2,3,4,5}; rejects 0, 6, 2.5, NaN, and
 * any non-number (D-03, ASVS V5).
 */
export function isValidRating(value: unknown): value is 1 | 2 | 3 | 4 | 5 {
  return typeof value === "number" && Number.isInteger(value) && RATINGS.has(value);
}

/**
 * Order statuses that count as proof of purchase (D-01). Deliberately excludes
 * `pending`/`cancelled` so an abandoned/unpaid checkout can never yield a
 * "Verified purchase" review (RESEARCH Pitfall 4).
 */
export const ELIGIBLE_REVIEW_STATUSES = ["paid", "fulfilled"] as const;

/**
 * Pure aggregation: collect every non-empty item slug across a set of orders.
 * The DB-free core that makes the hasPurchased slug-match behavior testable
 * against a fake order array.
 */
export function purchasedSlugs(orders: { items: string }[]): Set<string> {
  const slugs = new Set<string>();
  for (const order of orders) {
    for (const item of parseOrderItems(order.items)) {
      if (item.slug) slugs.add(item.slug);
    }
  }
  return slugs;
}

export type RatingSummary = { avg: number; count: number };

/**
 * Pure: seed a map with every requested id defaulted to {avg:0,count:0} (the
 * D-04 zero-review default groupBy omits), then overwrite from each grouped row.
 */
export function toRatingMap(
  ids: string[],
  grouped: { productId: string; _avg: { rating: number | null }; _count: { rating: number } }[],
): Map<string, RatingSummary> {
  const map = new Map<string, RatingSummary>();
  for (const id of ids) map.set(id, { avg: 0, count: 0 });
  for (const row of grouped) {
    map.set(row.productId, { avg: row._avg.rating ?? 0, count: row._count.rating });
  }
  return map;
}

// ---- Async query helpers (Prisma-importing) ----

/**
 * Verified-purchase eligibility (D-01). Matched by SLUG, because Order.items is
 * snapshotted by slug only (RESEARCH Pitfall 1) — never by product id, never via
 * raw JSON SQL (breaks at the Phase 11 Postgres migration). Cost scales with the
 * user's own orders via the indexed userId FK, never with table size.
 */
export async function hasPurchased(userId: string, productSlug: string): Promise<boolean> {
  const orders = await prisma.order.findMany({
    where: { userId, status: { in: [...ELIGIBLE_REVIEW_STATUSES] } },
    select: { items: true },
  });
  return purchasedSlugs(orders).has(productSlug);
}

/**
 * One bounded groupBy per page — never one query per product (no N+1), never
 * include:{reviews}. Returns a summary for every requested id (D-04).
 */
export async function getRatingSummaries(
  productIds: string[],
): Promise<Map<string, RatingSummary>> {
  if (productIds.length === 0) return new Map();
  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return toRatingMap(productIds, grouped);
}

/** Single-product rating aggregate (used by 10-11 JSON-LD aggregateRating). */
export async function getRatingSummary(productId: string): Promise<RatingSummary> {
  const agg = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { avg: agg._avg.rating ?? 0, count: agg._count.rating };
}

export type ReviewWithAuthor = {
  id: string;
  rating: number;
  title: string;
  body: string | null;
  createdAt: Date;
  authorName: string;
};

export type ReviewRecord = {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string;
  body: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Paginated review list for a product. Bounded single-relation include of the
 * author's public display name only (never email/id).
 */
export async function getReviewsForProduct(
  productId: string,
  opts?: { take?: number; skip?: number },
): Promise<{ reviews: ReviewWithAuthor[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      take: opts?.take,
      skip: opts?.skip,
      include: { user: { select: { name: true } } },
    }),
    prisma.review.count({ where: { productId } }),
  ]);
  const reviews: ReviewWithAuthor[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt,
    authorName: r.user.name ?? "Verified buyer",
  }));
  return { reviews, total };
}

/** The write UI (10-05) reads this to render the "already reviewed" state. */
export async function getUserReview(
  userId: string,
  productId: string,
): Promise<ReviewRecord | null> {
  return prisma.review.findUnique({
    where: { productId_userId: { productId, userId } },
  });
}

const TITLE_MAX = 120;
const BODY_MAX = 4000;

/**
 * Upsert (not delete-then-recreate) preserves the row id and createdAt on edit
 * and, together with the DB @@unique([productId,userId]), enforces one review
 * per user (D-01/D-03). Asserts isValidRating and length-caps title/body as
 * defense in depth (ASVS V5). Session/eligibility gating lives in the 10-05
 * Server Action, which calls hasPurchased first.
 */
export async function upsertReview(input: {
  productId: string;
  userId: string;
  rating: number;
  title: string;
  body?: string | null;
}): Promise<void> {
  if (!isValidRating(input.rating)) {
    throw new Error(`Invalid rating: ${input.rating}`);
  }
  const title = input.title.slice(0, TITLE_MAX);
  const body = input.body != null ? input.body.slice(0, BODY_MAX) : input.body;
  await prisma.review.upsert({
    where: { productId_userId: { productId: input.productId, userId: input.userId } },
    update: { rating: input.rating, title, body },
    create: {
      productId: input.productId,
      userId: input.userId,
      rating: input.rating,
      title,
      body,
    },
  });
}
