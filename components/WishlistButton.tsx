"use client";

import { useWishlist, type WishlistItem } from "@/context/WishlistContext";

export default function WishlistButton({
  product,
  className = "",
}: {
  product: WishlistItem;
  className?: string;
}) {
  const { toggle, isWishlisted } = useWishlist();
  // isWishlisted reads from context state, which starts empty on both the
  // server render and the initial client render (WishlistProvider only
  // populates from localStorage after mount), so this is stable across
  // hydration — mirroring the cart nav badge's approach.
  const saved = isWishlisted(product.slug);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream/85 text-ink transition-colors hover:text-sepia ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M12 21s-7.5-4.6-10.2-9.1C.2 8.9 1.4 5.3 4.7 4.4c2-.5 4 .3 5.3 2.1 1.3-1.8 3.3-2.6 5.3-2.1 3.3.9 4.5 4.5 2.9 7.5C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}
