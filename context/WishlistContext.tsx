"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  addItem as addWishlistItem,
  hasItem,
  removeItem as removeWishlistItem,
  toggleItem as toggleWishlistItem,
  type WishlistItem,
} from "@/lib/wishlist";

export type { WishlistItem };

type WishlistContextValue = {
  items: WishlistItem[];
  count: number;
  toggle: (item: WishlistItem) => void;
  remove: (slug: string) => void;
  isWishlisted: (slug: string) => boolean;
  clear: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "nostalgia-wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted wishlist once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed as WishlistItem[]);
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  // Persist on change (after initial hydration).
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const toggle: WishlistContextValue["toggle"] = (item) => {
    setItems((prev) => toggleWishlistItem(prev, item));
  };

  const remove: WishlistContextValue["remove"] = (slug) => {
    setItems((prev) => removeWishlistItem(prev, slug));
  };

  const isWishlisted: WishlistContextValue["isWishlisted"] = (slug) =>
    hasItem(items, slug);

  const clear = () => setItems([]);

  const value: WishlistContextValue = {
    items,
    count: items.length,
    toggle,
    remove,
    isWishlisted,
    clear,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
