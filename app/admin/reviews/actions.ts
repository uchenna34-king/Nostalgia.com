"use server";

import { requireOwner } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Refresh every surface a review-visibility change affects: the admin list, the
// PDP list + average, the product-card stars (/, /shop), collection pages, and
// (via the shared aggregate) the Product JSON-LD — so a hidden review vanishes
// from all of them at once.
function revalidateReviewSurfaces() {
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/collections/[slug]", "page");
}

// Server Actions are independently-callable public HTTP endpoints — the admin
// layout render gate does NOT protect them, so each re-invokes requireOwner()
// as its FIRST statement before any prisma access (T-10-06-01).

/** Reversible soft flag — hides a review from the storefront. */
export async function hideReview(id: string): Promise<void> {
  await requireOwner();
  await prisma.review.update({ where: { id }, data: { hidden: true } });
  revalidateReviewSurfaces();
}

/** Restores a hidden review to the storefront (hide is not a one-way trap). */
export async function unhideReview(id: string): Promise<void> {
  await requireOwner();
  await prisma.review.update({ where: { id }, data: { hidden: false } });
  revalidateReviewSurfaces();
}

/** Hard, permanent delete — safe: a Review has no Order foreign-key dependency. */
export async function deleteReview(id: string): Promise<void> {
  await requireOwner();
  await prisma.review.delete({ where: { id } });
  revalidateReviewSurfaces();
}
