"use client";

import Link from "next/link";
import {
  deleteReview,
  hideReview,
  unhideReview,
} from "@/app/admin/reviews/actions";

type Row = {
  id: string;
  productName: string;
  productSlug: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  hidden: boolean;
  createdAt: string;
};

export default function ReviewModerationTable({ reviews }: { reviews: Row[] }) {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-sepia">Moderation</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">Reviews</h1>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-sm bg-cream-dark px-6 py-16 text-center">
          <h2 className="font-serif text-xl text-ink">No reviews yet</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Reviews appear here once customers post them.
          </p>
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-dark text-xs uppercase tracking-[0.15em] text-ink-soft">
            <tr>
              <th className="py-3 pr-4 font-medium">Product</th>
              <th className="py-3 pr-4 font-medium">Author</th>
              <th className="py-3 pr-4 font-medium">Rating</th>
              <th className="py-3 pr-4 font-medium">Title</th>
              <th className="py-3 pr-4 font-medium">Date</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr
                key={r.id}
                className={`border-b border-cream-dark/60 ${r.hidden ? "opacity-50" : ""}`}
              >
                <td className="py-3 pr-4">
                  <Link
                    href={`/product/${r.productSlug}`}
                    aria-label={`View ${r.productName} on the storefront`}
                    className="text-sepia hover:text-ink"
                  >
                    {r.productName}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-ink-soft">{r.author}</td>
                <td className="py-3 pr-4 tabular-nums text-ink">{r.rating}/5</td>
                <td className="py-3 pr-4 text-ink">{r.title}</td>
                <td className="py-3 pr-4 text-ink-soft">{r.createdAt}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.1em] ${
                      r.hidden
                        ? "bg-[#9B2C2C]/10 text-[#9B2C2C]"
                        : "bg-cream-dark text-ink-soft"
                    }`}
                  >
                    {r.hidden ? "Hidden" : "Visible"}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-4">
                    {r.hidden ? (
                      <form action={unhideReview.bind(null, r.id)}>
                        <button
                          type="submit"
                          aria-label={`Unhide review "${r.title}"`}
                          className="text-sepia hover:text-ink"
                        >
                          Unhide
                        </button>
                      </form>
                    ) : (
                      <form action={hideReview.bind(null, r.id)}>
                        <button
                          type="submit"
                          aria-label={`Hide review "${r.title}"`}
                          className="text-sepia hover:text-ink"
                        >
                          Hide
                        </button>
                      </form>
                    )}
                    <form
                      action={deleteReview.bind(null, r.id)}
                      onSubmit={(e) => {
                        if (
                          !confirm(
                            "Delete this review? It will no longer appear on the storefront. This can't be undone.",
                          )
                        ) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <button
                        type="submit"
                        aria-label={`Delete review "${r.title}"`}
                        className="text-[#9B2C2C] hover:underline"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
