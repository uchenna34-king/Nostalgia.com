"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { STAR_PATH } from "@/components/RatingStars";
import { submitReview } from "@/app/product/[slug]/actions";

export type ReviewEligibility =
  | "signed-out"
  | "no-purchase"
  | "eligible"
  | "already-reviewed";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * The reviews WRITE surface (UI-SPEC §1, D-01/D-03). `eligibility` is derived
 * server-side by the PDP and is DISPLAY ONLY — submitReview independently
 * re-checks session + purchase on every submit, so a tampered client can never
 * post a review it isn't entitled to (T-10-05-01).
 */
export default function ReviewForm({
  slug,
  eligibility,
  existingReview,
}: {
  slug: string;
  eligibility: ReviewEligibility;
  existingReview?: { rating: number; title: string; body: string | null };
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [status, setStatus] = useState<Status>("idle");
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Checked BEFORE the eligibility branches: a successful post triggers
  // router.refresh(), which re-renders this island with eligibility flipped to
  // "already-reviewed". If that branch won, the confirmation would vanish the
  // instant it appeared — and screen-reader users would lose the aria-live
  // announcement that is their only signal the submit succeeded (UI-SPEC §1).
  if (status === "success") {
    return (
      <p
        role="status"
        aria-live="polite"
        className="mt-10 text-sm text-ink-soft"
      >
        Thanks — your review is live.
      </p>
    );
  }

  if (eligibility === "signed-out") {
    return (
      <div className="mt-10">
        <p className="text-sm text-ink-soft">
          Sign in with a verified purchase to leave a review.
        </p>
        <button
          type="button"
          onClick={() => signIn()}
          className="btn-outline mt-4"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (eligibility === "no-purchase") {
    return (
      <p className="mt-10 text-sm text-ink-soft">
        Reviews are open to customers who&apos;ve purchased this item.
      </p>
    );
  }

  if (eligibility === "already-reviewed") {
    return (
      <div className="mt-10">
        <p className="text-sm text-ink-soft">
          You&apos;ve already reviewed this product.
        </p>
        <a href="#reviews" className="link-underline mt-2 inline-block text-sm">
          View your review
        </a>
      </div>
    );
  }

  const submitting = status === "submitting";

  /** Move selection + focus together — roving tabindex keyboard contract. */
  function selectStar(next: number) {
    const clamped = Math.min(5, Math.max(1, next));
    setRating(clamped);
    starRefs.current[clamped - 1]?.focus();
  }

  function onStarKeyDown(e: React.KeyboardEvent, index: number) {
    const current = rating || index + 1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      selectStar(current + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      selectStar(current - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectStar(1);
    } else if (e.key === "End") {
      e.preventDefault();
      selectStar(5);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectStar(index + 1);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("rating", String(rating));
    setStatus("submitting");
    const result = await submitReview(formData);
    if (result.ok) {
      setStatus("success");
      // Re-render the server component so ReviewList shows the new review.
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 border border-ink/10 bg-cream-dark/40 p-6"
    >
      <h3 className="font-serif text-2xl font-normal">Write a review</h3>

      {status === "error" && (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-4 text-sm text-[#9B2C2C]"
        >
          Couldn&apos;t post your review — check the fields and try again.
        </p>
      )}

      <input type="hidden" name="slug" value={slug} />

      <div
        role="radiogroup"
        aria-label="Rating"
        className="mt-6 flex items-center gap-1"
      >
        {[1, 2, 3, 4, 5].map((value, index) => {
          const filled = value <= rating;
          return (
            <button
              key={value}
              ref={(el) => {
                starRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              tabIndex={rating === value || (rating === 0 && index === 0) ? 0 : -1}
              disabled={submitting}
              onClick={() => setRating(value)}
              onKeyDown={(e) => onStarKeyDown(e, index)}
              className="flex h-11 w-11 items-center justify-center disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                className={filled ? "text-sepia" : "text-ink/25"}
                fill={filled ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={filled ? 0 : 1.5}
                aria-hidden="true"
              >
                <path d={STAR_PATH} />
              </svg>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <label
          htmlFor="review-title"
          className="mb-1 block text-xs uppercase tracking-[0.15em] text-ink-soft"
        >
          Title
        </label>
        <input
          id="review-title"
          name="title"
          type="text"
          required
          maxLength={120}
          disabled={submitting}
          defaultValue={existingReview?.title ?? ""}
          className="w-full border border-ink bg-cream px-6 py-3.5 text-sm disabled:opacity-60"
        />
      </div>

      <div className="mt-4">
        <label
          htmlFor="review-body"
          className="mb-1 block text-xs uppercase tracking-[0.15em] text-ink-soft"
        >
          Review (optional)
        </label>
        <textarea
          id="review-body"
          name="body"
          rows={4}
          maxLength={2000}
          disabled={submitting}
          defaultValue={existingReview?.body ?? ""}
          className="w-full border border-ink bg-cream px-6 py-3.5 text-sm disabled:opacity-60"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary mt-6 disabled:opacity-60"
      >
        {submitting ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}
