"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * Shown when a signed-out visitor tries to check out. Every buyer must hold a
 * verified account before an order is created — /api/checkout enforces that
 * server-side; this dialog only explains it before the redirect. Sits above
 * CartDrawer (z-[60]/z-[70]) because it is opened from inside the drawer.
 *
 * Same dialog a11y contract as SizeGuideModal: focus-in on open, focus trap,
 * Escape to close, body scroll lock, focus restored to the trigger.
 */
export default function SignUpPrompt({
  open,
  onClose,
  onContinue,
  callbackUrl = "/checkout",
  googleEnabled = false,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * Only changes the copy. The dialog links to /register and /signin, which
   * render "Continue with Google" themselves when it's configured.
   */
  googleEnabled?: boolean;
  /** Runs when the visitor heads to sign-in (e.g. to close the cart drawer). */
  onContinue?: () => void;
  callbackUrl?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primaryRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
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
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      const el = restoreRef.current;
      if (el instanceof HTMLElement && document.contains(el)) el.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleContinue() {
    onClose();
    onContinue?.();
  }

  const headingId = "signup-prompt-heading";
  const descId = "signup-prompt-desc";

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-[80] bg-ink/50 transition-opacity motion-reduce:transition-none"
      />

      {/* Centered on sm+, bottom sheet under 640px. */}
      <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          aria-describedby={descId}
          className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-xl border border-ink/10 bg-cream px-6 pb-7 pt-8 text-center shadow-xl sm:rounded-xl sm:px-10"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center text-2xl leading-none text-ink hover:text-sepia"
          >
            ×
          </button>

          <p className="eyebrow">Before you check out</p>
          <h2 id={headingId} className="mt-3 font-serif text-3xl font-normal">
            Create your account
          </h2>
          <p id={descId} className="mt-3 text-sm text-ink-soft">
            Every order on Nostalgia is placed from a verified account. Sign up
            with your name and email{googleEnabled ? ", or with Google" : ""}.
            Your bag stays exactly as it is.
          </p>

          <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm">
            <li className="flex gap-3">
              <span aria-hidden>✓</span>
              <span>A verified email, so orders reach the right person</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden>✓</span>
              <span>Order history and delivery tracking</span>
            </li>
            <li className="flex gap-3 text-ink-soft">
              <span aria-hidden>✓</span>
              <span>Two-step verification, coming soon</span>
            </li>
          </ul>

          <Link
            ref={primaryRef}
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            onClick={handleContinue}
            className="btn-primary mt-7 w-full"
          >
            Create an account
          </Link>
          <Link
            href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            onClick={handleContinue}
            className="btn-outline mt-3 w-full"
          >
            I already have an account
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 text-xs uppercase tracking-[0.18em] text-ink-soft underline"
          >
            Keep browsing
          </button>
        </div>
      </div>
    </>
  );
}
