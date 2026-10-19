import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPurchased } from "@/lib/reviews";
import type { ReviewEligibility } from "@/components/ReviewForm";

export const dynamic = "force-dynamic";

/** Per-person answer: never stored by the browser, a CDN, or the data cache. */
const PRIVATE = { "Cache-Control": "private, no-store" };

export type ReviewFormState = {
  eligibility: ReviewEligibility;
  existingReview?: { rating: number; title: string; body: string | null };
};

/**
 * GET /api/reviews/eligibility?slug=<product slug>
 *
 * What the review form should offer the shopper looking at it. The product
 * page is a cached page shared by everyone, so this per-person part is asked
 * for from the browser (components/ReviewFormIsland.tsx). DISPLAY ONLY:
 * submitReview re-derives session and purchase on every submit (D-01,
 * T-10-05-01), so a forged answer here can never post a review.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "missing_slug" }, { status: 400, headers: PRIVATE });
  }

  // Identity comes from the session cookie only — never from the query.
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json<ReviewFormState>({ eligibility: "signed-out" }, { headers: PRIVATE });
  }

  const [purchased, own] = await Promise.all([
    hasPurchased(userId, slug),
    prisma.review.findFirst({
      where: { userId, product: { slug } },
      select: { rating: true, title: true, body: true },
    }),
  ]);

  let state: ReviewFormState;
  if (!purchased) state = { eligibility: "no-purchase" };
  else if (own) state = { eligibility: "already-reviewed", existingReview: own };
  else state = { eligibility: "eligible" };
  return NextResponse.json(state, { headers: PRIVATE });
}
