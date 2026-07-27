// Shared, server-safe star-rating glyph (UI-SPEC §1). No "use client"/hooks so
// it imports cleanly into both Server Components (PDP, ProductCard) and client
// islands (ReviewList). One 24×24 star path reused at 16/20/28px; the fill is an
// overlay clipped to a half-star-accurate percentage. WCAG 1.4.1: the rating is
// always exposed as a numeric text equivalent via role="img" + aria-label; the
// decorative SVGs are aria-hidden.

const STAR_PATH =
  "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 21.4l1.4-6.8L2.2 9.9l6.9-.8z";

/** Clamp to [0,5], round to the nearest half-star, return a 0–100 fill %. */
export function starFillPercent(value: number): number {
  const clamped = Math.min(5, Math.max(0, value));
  const rounded = Math.round(clamped * 2) / 2;
  return (rounded / 5) * 100;
}

function Row({ filled, size }: { filled: boolean; size: number }) {
  return (
    <span className="inline-flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`shrink-0 ${filled ? "text-sepia" : "text-ink/25"}`}
          fill={filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={filled ? 0 : 1.5}
          aria-hidden="true"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

export default function RatingStars({
  value,
  size = 16,
  count,
  srLabel,
}: {
  value: number;
  size?: number;
  count?: number;
  srLabel?: string;
}) {
  const label =
    srLabel ??
    `${value.toFixed(1)} out of 5 stars` +
      (count !== undefined ? `, ${count} review${count === 1 ? "" : "s"}` : "");

  return (
    <span role="img" aria-label={label} className="relative inline-flex">
      <Row filled={false} size={size} />
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${starFillPercent(value)}%` }}
        aria-hidden="true"
      >
        <Row filled size={size} />
      </span>
    </span>
  );
}
