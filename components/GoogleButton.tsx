"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

/**
 * "Continue with Google" — the one way customers sign in. One button covers
 * both sign-up and sign-in: a first Google sign-in creates the account, later
 * ones sign straight in.
 * Render it only when Google is configured (`googleEnabled` from lib/auth).
 */
export default function GoogleButton({
  callbackUrl,
  disabled = false,
  onStart,
}: {
  callbackUrl: string;
  /** Set while a sibling sign-in method is in flight. */
  disabled?: boolean;
  /** Lets the parent lock its other controls once the redirect starts. */
  onStart?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    onStart?.();
    // Always the real OAuth provider — a button wearing the Google mark must
    // never authenticate through anything else.
    await signIn("google", { callbackUrl });
  }

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={disabled || loading}
      className="flex w-full items-center justify-center gap-3 border border-ink bg-cream px-6 py-3.5 text-sm font-medium transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
        />
      </svg>
      {loading ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}
