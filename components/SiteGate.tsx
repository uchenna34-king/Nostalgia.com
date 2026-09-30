"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import GoogleButton from "@/components/GoogleButton";

/**
 * "Before you continue": the sign-in / register wall a signed-out visitor
 * meets on any storefront page (AppFrame decides when; lib/site-gate.ts lists
 * the pages that stay open). It is deliberately NOT dismissible — no close
 * button, Escape does nothing, the backdrop doesn't close it — and AppFrame
 * makes the page behind it inert, so the only ways forward are its links.
 *
 * This is a browsing gate, not a security boundary: anything that must be
 * protected (checkout, account, admin) is still enforced on the server.
 *
 * Keeps the rest of the dialog a11y contract from SizeGuideModal: focus moves
 * in on open, Tab is trapped, body scroll is locked.
 */
export default function SiteGate({
  open,
  provisional = false,
  callbackUrl,
  googleEnabled,
}: {
  open: boolean;
  /**
   * Rendered before the session is known (the server HTML), so a new visitor
   * sees the gate at first paint. CSS hides it when the session hint says this
   * browser was signed in (lib/site-gate.ts), and it takes no scroll lock or
   * focus until it's confirmed.
   */
  provisional?: boolean;
  /** Where to land after signing in — the page the visitor was trying to see. */
  callbackUrl: string;
  googleEnabled: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const active = open && !provisional;

  useEffect(() => {
    if (!active) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the heading rather than a button, so the first thing a screen
    // reader announces is why the page is blocked.
    headingRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!panel.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [active]);

  if (!open) return null;

  const headingId = "site-gate-heading";
  const descId = "site-gate-desc";
  const next = encodeURIComponent(callbackUrl);

  return (
    <div data-gate-provisional={provisional ? "" : undefined}>
      {/* `shade`, not `ink`: ink inverts in dark mode and would wash the
          page light instead of dimming it. */}
      <div
        aria-hidden
        className="fixed inset-0 z-[100] bg-shade/60 backdrop-blur-md"
      />

      {/* Centered on every screen size — this is the first thing a visitor
          sees, so it sits in the middle rather than docking at the bottom. */}
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          aria-describedby={descId}
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink/10 bg-cream px-6 pb-8 pt-9 text-center shadow-xl sm:px-10"
        >
          <p className="eyebrow">The House of Nostalgia</p>
          <h2
            ref={headingRef}
            id={headingId}
            tabIndex={-1}
            className="mt-3 font-serif text-3xl font-normal focus:outline-none"
          >
            Before you continue
          </h2>
          <p id={descId} className="mt-3 text-sm text-ink-soft">
            Sign in or create an account to explore the collection. Every
            account is verified, and your bag and wishlist stay with you.
          </p>

          <div className="mt-7">
            {googleEnabled && <GoogleButton callbackUrl={callbackUrl} />}

            <Link
              href={`/register?callbackUrl=${next}`}
              className="btn-primary w-full"
            >
              Create an account
            </Link>
            <Link
              href={`/signin?callbackUrl=${next}`}
              className="btn-outline mt-3 w-full"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-6 text-xs text-ink-soft">
            Read our{" "}
            <Link href="/shipping" className="underline">
              shipping
            </Link>{" "}
            and{" "}
            <Link href="/returns" className="underline">
              returns
            </Link>{" "}
            policies.
          </p>
        </div>
      </div>
    </div>
  );
}
