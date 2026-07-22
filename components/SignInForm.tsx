"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInForm({
  googleEnabled,
  callbackUrl,
  ownerEmail,
}: {
  googleEnabled: boolean;
  callbackUrl: string;
  ownerEmail?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  async function handleGoogle() {
    setLoading(true);
    if (googleEnabled) {
      // Real OAuth — redirects to Google's consent screen.
      await signIn("google", { callbackUrl });
    } else {
      // Dev fallback — sign in as the typed demo email (blank → default demo
      // customer via the credentials provider).
      await signIn("demo", { email: email.trim(), callbackUrl });
    }
  }

  async function handleOwner() {
    setLoading(true);
    // Dev convenience: sign in as the store owner and go straight to /admin.
    await signIn("demo", { email: ownerEmail, callbackUrl: "/admin" });
  }

  return (
    <div className="w-full max-w-sm">
      {!googleEnabled && (
        <div className="mb-4 text-left">
          <label
            htmlFor="dev-email"
            className="mb-1 block text-xs uppercase tracking-[0.15em] text-ink-soft"
          >
            Dev email (optional)
          </label>
          <input
            id="dev-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-ink/20 bg-cream px-3 py-2.5 text-sm"
          />
        </div>
      )}

      <button
        onClick={handleGoogle}
        disabled={loading}
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

      {!googleEnabled && (
        <>
          <button
            onClick={handleOwner}
            disabled={loading}
            className="mt-3 w-full border border-sepia px-6 py-3 text-sm font-medium text-sepia transition-colors hover:bg-sepia hover:text-cream disabled:opacity-60"
          >
            Sign in as store owner → Admin
          </button>
          <p className="mt-4 text-center text-xs text-ink-soft">
            Dev mode: no Google keys set. Leave email blank to sign in as a demo
            customer, or use “Sign in as store owner” to open the admin
            {ownerEmail ? (
              <>
                {" "}
                as <span className="font-mono">{ownerEmail}</span>
              </>
            ) : null}
            . Add <span className="font-mono">GOOGLE_CLIENT_ID</span> /{" "}
            <span className="font-mono">GOOGLE_CLIENT_SECRET</span> in{" "}
            <span className="font-mono">.env</span> for real Google auth.
          </p>
        </>
      )}
    </div>
  );
}
