"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useSession, signIn } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import Wordmark from "@/components/Wordmark";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/shop?category=Outerwear", label: "One of one" },
  { href: "/shop", label: "The House" },
];

export default function Nav() {
  const { count, openDrawer } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="glass-panel sticky top-0 z-50 relative">
      <nav className="container-x relative flex h-16 items-center gap-4">
        {/* Mobile / tablet toggle */}
        <button
          className="-ml-1 p-1 text-ink lg:hidden"
          aria-label="Menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            className="h-6 w-6"
            aria-hidden
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        {/* Wordmark — floats centered on mobile, sits left on desktop so the
            links flow after it without colliding. The centered-logo layout
            could not fit five links at any width. */}
        <Link
          href="/"
          aria-label="Nostalgia — home"
          className="absolute left-1/2 -translate-x-1/2 shrink-0 lg:static lg:left-auto lg:translate-x-0"
        >
          <Wordmark className="text-[1.6rem] sm:text-[1.8rem]" />
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-6 lg:ml-4 lg:flex">
          {LINKS.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                className="link-underline text-[13px] font-medium tracking-[0.01em] text-ink-soft hover:text-ink"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right: account + wishlist + cart. Wishlist/Cart render as icons on
            mobile (to fit the narrowest phones) and as text on md+. Each control
            carries an aria-label that *contains* its visible word, so the icon
            state has an accessible name and the text state still satisfies WCAG
            2.5.3 Label in Name (visible "Wishlist"/"Cart" ⊂ the label). The count
            badge is aria-hidden — the count already rides in the label. */}
        <div className="ml-auto flex items-center gap-4 sm:gap-5">
          {session?.user ? (
            <Link
              href="/account"
              className="hidden text-sm font-bold uppercase tracking-[0.18em] text-ink-soft hover:text-ink sm:block"
            >
              {session.user.name?.split(" ")[0] ?? "Account"}
            </Link>
          ) : (
            <button
              onClick={() => signIn()}
              className="hidden text-sm font-bold uppercase tracking-[0.18em] text-ink-soft hover:text-ink sm:block"
            >
              Sign in
            </button>
          )}

          <ThemeToggle />

          <Link
            href="/wishlist"
            aria-label={`Wishlist, ${wishlistCount} saved`}
            className="relative flex items-center text-ink hover:text-sepia"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinejoin="round"
              className="h-6 w-6 lg:hidden"
              aria-hidden
            >
              <path d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.4 5 6 5c2.1 0 3.2 1.25 4 2.6C10.8 6.25 11.9 5 14 5c3.6 0 5 3.5 3.5 6.5C19 15.65 12 20 12 20Z" />
            </svg>
            <span className="hidden text-sm font-bold uppercase tracking-[0.18em] lg:inline">
              Wishlist
            </span>
            <span
              aria-hidden
              className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-ink px-1 py-0.5 text-[9px] leading-none text-cream md:static md:ml-1 md:min-w-5 md:px-1.5 md:text-[10px]"
            >
              {wishlistCount}
            </span>
          </Link>

          <button
            onClick={openDrawer}
            aria-label={`Cart, ${count} items`}
            className="relative flex items-center text-ink hover:text-sepia"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="h-6 w-6 lg:hidden"
              aria-hidden
            >
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <span className="hidden text-sm font-bold uppercase tracking-[0.18em] lg:inline">
              Cart
            </span>
            <span
              aria-hidden
              className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-ink px-1 py-0.5 text-[9px] leading-none text-cream md:static md:ml-1 md:min-w-5 md:px-1.5 md:text-[10px]"
            >
              {count}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile / tablet menu — a glass panel that overlays the hero rather than
          a solid bar. Always in the DOM so it can animate both ways; the hero
          reads through the translucent cream + backdrop-blur. `pointer-events`
          and `aria-hidden` track the open state so the closed panel is inert. */}
      <div
        id="mobile-nav"
        aria-hidden={!mobileOpen}
        className={`glass-panel absolute inset-x-0 top-full origin-top transition-all duration-300 ease-out lg:hidden ${
          mobileOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <ul className="container-x flex flex-col py-2">
          {LINKS.map((l) => (
            <li key={l.label} className="border-b border-ink/10 last:border-0">
              <Link
                href={l.href}
                onClick={() => setMobileOpen(false)}
                tabIndex={mobileOpen ? 0 : -1}
                className="block py-4 text-sm font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:text-sepia"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
