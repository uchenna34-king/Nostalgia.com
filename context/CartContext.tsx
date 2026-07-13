"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  slug: string;
  name: string;
  price: number; // cents
  image: string;
  size: string;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number; // cents
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (slug: string, size: string) => void;
  updateQty: (slug: string, size: string, qty: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "nostalgia-cart";

function keyOf(slug: string, size: string) {
  return `${slug}::${size}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted cart once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
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

  const addItem: CartContextValue["addItem"] = (item, qty = 1) => {
    setItems((prev) => {
      const k = keyOf(item.slug, item.size);
      const existing = prev.find((i) => keyOf(i.slug, i.size) === k);
      if (existing) {
        return prev.map((i) =>
          keyOf(i.slug, i.size) === k ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [...prev, { ...item, qty }];
    });
    setIsOpen(true);
  };

  const removeItem: CartContextValue["removeItem"] = (slug, size) => {
    setItems((prev) =>
      prev.filter((i) => keyOf(i.slug, i.size) !== keyOf(slug, size)),
    );
  };

  const updateQty: CartContextValue["updateQty"] = (slug, size, qty) => {
    setItems((prev) =>
      prev
        .map((i) =>
          keyOf(i.slug, i.size) === keyOf(slug, size)
            ? { ...i, qty: Math.max(0, qty) }
            : i,
        )
        .filter((i) => i.qty > 0),
    );
  };

  const clear = () => setItems([]);

  const { count, subtotal } = useMemo(() => {
    return items.reduce(
      (acc, i) => {
        acc.count += i.qty;
        acc.subtotal += i.qty * i.price;
        return acc;
      },
      { count: 0, subtotal: 0 },
    );
  }, [items]);

  const value: CartContextValue = {
    items,
    count,
    subtotal,
    isOpen,
    addItem,
    removeItem,
    updateQty,
    clear,
    openDrawer: () => setIsOpen(true),
    closeDrawer: () => setIsOpen(false),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
