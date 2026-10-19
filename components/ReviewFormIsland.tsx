"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ReviewForm from "@/components/ReviewForm";
import type { ReviewFormState } from "@/app/api/reviews/eligibility/route";

/**
 * The review form for a cached product page.
 *
 * The page HTML is shared by every visitor, so it cannot say who is looking.
 * This island works it out in the browser: anonymous visitors — most traffic —
 * get the sign-in prompt straight from the session, with no request; a
 * signed-in shopper's real eligibility comes from /api/reviews/eligibility.
 *
 * After a successful post, ReviewForm shows its confirmation and refreshes
 * the page; this island stays mounted, so the confirmation is not replaced.
 */
export default function ReviewFormIsland({ slug }: { slug: string }) {
  const { status } = useSession();
  const [state, setState] = useState<ReviewFormState | "failed" | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch(`/api/reviews/eligibility?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then((res) =>
        res.ok ? (res.json() as Promise<ReviewFormState>) : Promise.reject(res.status),
      )
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [status, slug]);

  if (status === "unauthenticated") {
    return <ReviewForm slug={slug} eligibility="signed-out" />;
  }
  // A failed check shows nothing: a signed-in shopper must never be told to
  // sign in, and the review list above still renders. Posting is unaffected.
  if (state === "failed") return null;
  if (state) {
    return (
      <ReviewForm
        slug={slug}
        eligibility={state.eligibility}
        existingReview={state.existingReview}
      />
    );
  }
  // Loading: hold roughly the sign-in prompt's height so the footer doesn't jump.
  return <div aria-hidden className="mt-10 h-[5.25rem]" />;
}
