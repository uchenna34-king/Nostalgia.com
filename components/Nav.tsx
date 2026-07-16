"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useSession, signIn } from "next-auth/react";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?category=Outerwear", label: "Outerwear" },
  { href: "/shop?category=Knitwear", label: "Knitwear" },
  { href: "/shop?category=Accessories", label: "Accessories" },
];

export default function Nav() {
  const { count, openDrawer } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/85 backdrop-blur">
      <nav className="container-x flex h-16 items-center justify-between">
        {/* Left: desktop links / mobile toggle */}
        <div className="flex flex-1 items-center gap-6">
          <button
            className="md:hidden"
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="text-xl">≡</span>
          </button>
          <ul className="hidden items-center gap-6 md:flex">
            {LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="link-underline text-xs uppercase tracking-[0.18em] text-ink-soft hover:text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Center: wordmark */}
        <Link
          href="/"
          className="font-serif text-2xl font-black tracking-tight sm:text-3xl"
        >
          NOSTALGIA
        </Link>

        {/* Right: account + cart */}
        <div className="flex flex-1 items-center justify-end gap-5">
          {session?.user ? (
            <Link
              href="/account"
              className="hidden text-xs uppercase tracking-[0.18em] text-ink-soft hover:text-ink sm:block"
            >
              {session.user.name?.split(" ")[0] ?? "Account"}
            </Link>
          ) : (
            <button
              onClick={() => signIn()}
              className="hidden text-xs uppercase tracking-[0.18em] text-ink-soft hover:text-ink sm:block"
            >
              Sign in
            </button>
          )}
          <Link
            href="/wishlist"
            className="relative text-xs uppercase tracking-[0.18em] text-ink hover:text-sepia"
            aria-label="Open wishlist"
          >
            Wishlist
            <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-ink px-1.5 py-0.5 text-[10px] leading-none text-cream">
              {wishlistCount}
            </span>
          </Link>
          <button
            onClick={openDrawer}
            className="relative text-xs uppercase tracking-[0.18em] text-ink hover:text-sepia"
            aria-label="Open cart"
          >
            Cart
            <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-ink px-1.5 py-0.5 text-[10px] leading-none text-cream">
              {count}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <ul className="flex flex-col gap-1 border-t border-ink/10 px-5 py-3 md:hidden">
          {LINKS.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm uppercase tracking-[0.18em] text-ink-soft"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
