"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useSession, signIn } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import Wordmark from "@/components/Wordmark";
import { MegaPanel, MobileShopMenu } from "@/components/ShopMenu";
import { DEPARTMENTS, type DepartmentSlug } from "@/lib/taxonomy";

// Women and Men lead the bar (they open the shop menus); these follow.
const LINKS = [
  { href: "/collections", label: "Collections" },
  { href: "/shop?category=Outerwear", label: "One of one" },
  { href: "/shop", label: "The House" },
];

export default function Nav() {
  const { count, openDrawer } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { data: session } = useSession();
  // Set server-side in lib/auth.ts; only decides whether the link shows.
  const isOwner = Boolean(
    (session?.user as { isOwner?: boolean } | undefined)?.isOwner,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDept, setOpenDept] = useState<DepartmentSlug | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const pathname = usePathname();
  const pathDept: DepartmentSlug = pathname.startsWith("/shop/men")
    ? "men"
    : "women";

  // Hover intent: leaving the trigger or the panel waits a beat before
  // closing, so the pointer can cross the gap between them.
  const holdOpen = (d: DepartmentSlug) => {
    clearTimeout(closeTimer.current);
    setOpenDept(d);
  };
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenDept(null), 140);
  };
  const closeAll = () => {
    clearTimeout(closeTimer.current);
    setOpenDept(null);
    setMobileOpen(false);
  };

  // Any navigation closes every menu.
  useEffect(closeAll, [pathname]);

  // Escape closes the desktop panel and hands focus back to its trigger.
  useEffect(() => {
    if (!openDept) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const d = openDept;
      setOpenDept(null);
      document.getElementById(`trigger-${d}`)?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDept]);

  return (
    <header className="glass-panel sticky top-0 z-50 relative">
      <nav className="container-x relative flex h-16 items-center gap-2 sm:gap-3 lg:h-20 lg:gap-4">
        {/* Left group — the menu button alone. It keeps an equal basis with the
            right group, so the wordmark between them sits on the true centre
            line however wide the right cluster grows. Empty from lg, where the
            bar switches to the left-anchored wordmark + links layout. */}
        <div className="flex min-w-0 flex-1 basis-0 items-center lg:hidden">
          <button
            className="-ml-1 p-1 text-ink"
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
        </div>

        {/* Wordmark — centred between the two equal groups on mobile, anchored
            left from lg so the links flow after it (the centred-logo layout
            could not fit five links at any width). It steps down in size on
            the narrowest phones: at 1.6rem the lockup plus the icon cluster
            did not fit a 320–375px row, which is what produced the overlap. The
            extra step below 360px buys clearance from the theme switch, which
            now sits in the right cluster — at 1.2rem the ® all but touched it. */}
        <Link href="/" aria-label="Nostalgia — home" className="shrink-0">
          <Wordmark
            opticalCenter
            className="text-[1.05rem] min-[360px]:text-[1.2rem] sm:text-[1.5rem] lg:text-[1.8rem]"
          />
        </Link>

        {/* Desktop links. Women / Men are disclosure buttons: hover opens
            them for a pointer, click / Enter / Space for everyone else, and the
            panel itself carries a "Shop all" link to the department page. */}
        <ul className="hidden items-center gap-8 lg:ml-10 lg:flex">
          {DEPARTMENTS.map((d) => (
            <li
              key={d.slug}
              onMouseEnter={() => holdOpen(d.slug)}
              onMouseLeave={closeSoon}
            >
              <button
                id={`trigger-${d.slug}`}
                aria-expanded={openDept === d.slug}
                aria-controls={`menu-${d.slug}`}
                onClick={() => setOpenDept(openDept === d.slug ? null : d.slug)}
                className={`link-underline text-[13px] font-medium tracking-[0.01em] hover:text-ink ${
                  openDept === d.slug || pathname.startsWith(`/shop/${d.slug}`)
                    ? "text-ink"
                    : "text-ink-soft"
                }`}
              >
                {d.label}
              </button>
            </li>
          ))}
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

        {/* Right: account + theme + wishlist + cart. The theme switch belongs
            with the commerce controls at every width, not with the menu button. Wishlist/Cart render as icons on
            mobile (to fit the narrowest phones) and as text on md+. Each control
            carries an aria-label that *contains* its visible word, so the icon
            state has an accessible name and the text state still satisfies WCAG
            2.5.3 Label in Name (visible "Wishlist"/"Cart" ⊂ the label). The count
            badge is aria-hidden — the count already rides in the label. */}
        <div className="flex min-w-0 flex-1 basis-0 items-center justify-end gap-2.5 sm:gap-4 lg:ml-auto lg:flex-none lg:basis-auto lg:gap-5">
          {isOwner && (
            <Link
              href="/admin"
              className="link-underline hidden text-[13px] font-medium tracking-[0.01em] text-sepia hover:text-ink sm:block"
            >
              Admin
            </Link>
          )}
          {session?.user ? (
            <Link
              href="/account"
              className="link-underline hidden text-[13px] font-medium tracking-[0.01em] text-ink-soft hover:text-ink sm:block"
            >
              {session.user.name?.split(" ")[0] ?? "Account"}
            </Link>
          ) : (
            <button
              onClick={() => signIn()}
              className="link-underline hidden text-[13px] font-medium tracking-[0.01em] text-ink-soft hover:text-ink sm:block"
            >
              Sign in
            </button>
          )}

          <ThemeToggle />

          <Link
            href="/wishlist"
            aria-label={`Wishlist, ${wishlistCount} saved`}
            className="relative flex items-center text-ink transition-opacity hover:opacity-65"
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
            <span className="hidden text-[13px] font-medium tracking-[0.01em] lg:inline">
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
            className="relative flex items-center text-ink transition-opacity hover:opacity-65"
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
            <span className="hidden text-[13px] font-medium tracking-[0.01em] lg:inline">
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

      {openDept && (
        <MegaPanel
          dept={openDept}
          onNavigate={closeAll}
          onMouseEnter={() => holdOpen(openDept)}
          onMouseLeave={closeSoon}
        />
      )}

      {/* Mobile / tablet menu — a full-height solid sheet under the bar. It
          used to be frosted glass over the hero, which worked for four short
          links; with the whole shop tree in it, page copy showed through the
          menu text. Always in the DOM so it can animate both ways;
          `pointer-events` and `tabIndex` track the open state so the closed
          sheet is inert. */}
      <div
        id="mobile-nav"
        aria-hidden={!mobileOpen}
        className={`absolute inset-x-0 top-full h-[calc(100svh-4rem)] origin-top border-t border-ink/10 bg-cream overflow-y-auto overscroll-contain transition-all duration-300 ease-out lg:hidden ${
          mobileOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <div className="container-x pb-3">
          <MobileShopMenu
            key={pathDept}
            open={mobileOpen}
            initialDept={pathDept}
            onNavigate={closeAll}
          />
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li
                key={l.label}
                className="border-b border-ink/10 last:border-0"
              >
                <Link
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  tabIndex={mobileOpen ? 0 : -1}
                  className="block py-[18px] text-[16px] font-medium tracking-[0.01em] text-ink transition-colors hover:text-ink-soft"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {isOwner && (
              <li className="border-b border-ink/10 last:border-0">
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  tabIndex={mobileOpen ? 0 : -1}
                  className="block py-[18px] text-[16px] font-medium tracking-[0.01em] text-sepia transition-colors hover:text-ink"
                >
                  Admin
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </header>
  );
}
