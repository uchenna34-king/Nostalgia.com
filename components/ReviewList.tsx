"use client";

import { useState } from "react";
import RatingStars from "@/components/RatingStars";

export type ReviewDisplay = {
  id: string;
  rating: number;
  title: string;
  body: string | null;
  authorName: string;
  dateIso: string;
  dateLabel: string;
};

const PAGE = 5;

/**
 * Read-only review list (UI-SPEC §1). Renders the first 5 reviews with a
 * discrete, keyboard-reachable "Load more reviews" button (no infinite scroll).
 * Every review here is a verified purchase by construction (D-01), so the
 * "Verified purchase" tag renders unconditionally. All review-derived strings
 * render as escaped JSX text nodes — never dangerouslySetInnerHTML (T-10-04-01).
 */
export default function ReviewList({ reviews }: { reviews: ReviewDisplay[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE);

  return (
    <div className="mt-8">
      {reviews.slice(0, visibleCount).map((review) => (
        <article key={review.id} className="border-t border-ink/10 py-6">
          <RatingStars
            value={review.rating}
            size={20}
            srLabel={`${review.rating} out of 5 stars`}
          />
          <h3 className="mt-3 font-serif text-lg">{review.title}</h3>
          {review.body && (
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {review.body}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            <span>{review.authorName}</span>
            <span className="eyebrow inline-flex items-center gap-1 text-sepia">
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Verified purchase
            </span>
            <time dateTime={review.dateIso}>{review.dateLabel}</time>
          </div>
        </article>
      ))}

      {reviews.length > visibleCount && (
        <button
          type="button"
          onClick={() => setVisibleCount((n) => n + PAGE)}
          className="btn-outline mt-8"
        >
          Load more reviews
        </button>
      )}
    </div>
  );
}
