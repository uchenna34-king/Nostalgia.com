/**
 * Pure wishlist reducer/helpers (WISH-01). No React, no localStorage —
 * trivially unit-testable. Mirrors the cart's add/remove mental model but
 * keyed on `slug` only (a wishlist needs no size/qty). WishlistContext wraps
 * these helpers with localStorage persistence.
 */

export type WishlistItem = {
  slug: string;
  name: string;
  price: number; // cents
  image: string;
};

export function hasItem(items: WishlistItem[], slug: string): boolean {
  return items.some((i) => i.slug === slug);
}

export function addItem(
  items: WishlistItem[],
  item: WishlistItem,
): WishlistItem[] {
  if (hasItem(items, item.slug)) return items;
  return [...items, item];
}

export function removeItem(items: WishlistItem[], slug: string): WishlistItem[] {
  if (!hasItem(items, slug)) return items;
  return items.filter((i) => i.slug !== slug);
}

export function toggleItem(
  items: WishlistItem[],
  item: WishlistItem,
): WishlistItem[] {
  return hasItem(items, item.slug)
    ? removeItem(items, item.slug)
    : addItem(items, item);
}
