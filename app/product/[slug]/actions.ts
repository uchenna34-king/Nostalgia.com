"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPurchased, isValidRating } from "@/lib/reviews";

export type ReviewActionResult = { ok: true } | { ok: false; error: string };

const TITLE_MAX = 120;
const BODY_MAX = 2000;

/** Trim helper — fields are read one at a time, never spread into Prisma. */
function field(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// Refresh every surface an aggregate-rating change affects (D-04).
function revalidateStorefront(): void {
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/collections/[slug]", "page");
}

/**
 * Post (or edit) a product review — the security-critical write path (TRST-01).
 *
 * Server Actions are independently-callable public HTTP endpoints, so this
 * mirrors requireOwner()'s discipline: identity and purchase eligibility are
 * BOTH re-derived server-side on every submit, before any write. A client
 * "eligible" flag is display-only and is never trusted (D-01, T-10-05-01).
 */
export async function submitReview(
  formData: FormData,
): Promise<ReviewActionResult> {
  // Gate 1 — identity. Derived from the session cookie, never from the form.
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "not_authenticated" };

  // Explicit field-by-field extraction (mass-assignment mitigation).
  const slug = field(formData, "slug");
  const rating = Number(formData.get("rating"));
  const rawTitle = field(formData, "title");
  const rawBody = field(formData, "body");

  // Input validation, each failure distinctly reported (T-10-05-02).
  if (!isValidRating(rating)) return { ok: false, error: "invalid_rating" };
  if (!rawTitle) return { ok: false, error: "missing_title" };

  // Length-cap BEFORE persist; an empty body is stored as null (T-10-05-04).
  const title = rawTitle.slice(0, TITLE_MAX);
  const body = rawBody ? rawBody.slice(0, BODY_MAX) : null;

  // Gate 2 — eligibility. Re-run on EVERY submit, never cached client-side:
  // only a paid/fulfilled order containing this slug qualifies (D-01).
  if (!(await hasPurchased(userId, slug))) {
    return { ok: false, error: "not_eligible" };
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!product) return { ok: false, error: "product_not_found" };

  // The compound-unique key makes one-review-per-user structural, not just
  // app-enforced; upsert edits in place on resubmit, preserving id/createdAt
  // (D-01, T-10-05-03). Kept inline so the write sits next to its gates.
  await prisma.review.upsert({
    where: { productId_userId: { productId: product.id, userId } },
    update: { rating, title, body },
    create: { productId: product.id, userId, rating, title, body },
  });

  revalidateStorefront();
  return { ok: true };
}
