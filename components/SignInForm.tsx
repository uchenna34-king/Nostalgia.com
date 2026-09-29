"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

export default function SignInForm({
  googleEnabled,
  demoEnabled,
  callbackUrl,
  ownerEmail,
}: {
  googleEnabled: boolean;
  demoEnabled: boolean;
  callbackUrl: string;
  ownerEmail?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handlePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setPasswordError(null);
    const res = await signIn("password", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });
    if (!res || res.error) {
      setPasswordError("That email and password don't match an account.");
      setLoading(false);
      return;
    }
    // Full navigation so every server component re-renders signed in.
    // callbackUrl is already restricted to a same-site path by the page.
    window.location.assign(callbackUrl);
  }

  async function handleGoogle() {
    setLoading(true);
    // Always the real OAuth provider — a button wearing the Google mark must
    // never authenticate through anything else.
    await signIn("google", { callbackUrl });
  }

  async function handleDemo() {
    setLoading(true);
    // Blank email → default demo customer via the credentials provider.
    await signIn("demo", { email: email.trim(), callbackUrl });
  }

  async function handleOwner() {
    setLoading(true);
    await signIn("demo", { email: ownerEmail, callbackUrl: "/admin" });
  }

  return (
    <div className="w-full max-w-sm">
      {googleEnabled && (
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
      )}

      {googleEnabled && (
        <div className="my-4 flex items-center gap-3">
          <span className="flex-1 border-t border-cream-dark" aria-hidden />
          <span className="text-xs text-ink-soft">or</span>
          <span className="flex-1 border-t border-cream-dark" aria-hidden />
        </div>
      )}

      <form onSubmit={handlePassword} className="space-y-4 text-left">
        <div>
          <label
            htmlFor="signin-email"
            className="mb-1 block text-xs uppercase tracking-[0.15em] text-ink-soft"
          >
            Email
          </label>
          <input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full border border-ink/20 bg-cream px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="signin-password"
            className="mb-1 block text-xs uppercase tracking-[0.15em] text-ink-soft"
          >
            Password
          </label>
          <input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-describedby={passwordError ? "signin-error" : undefined}
            className="w-full border border-ink/20 bg-cream px-3 py-2.5 text-sm"
          />
        </div>
        {passwordError && (
          <p id="signin-error" role="alert" className="text-sm text-sepia">
            {passwordError}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-60"
        >
          Sign in
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link
          href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-ink underline"
        >
          Create an account
        </Link>
      </p>

      {demoEnabled && (
        <div className="mt-8 border-t border-cream-dark pt-6">

          <p className="mb-2 text-xs uppercase tracking-[0.15em] text-ink-soft">
            Demo login (for testers)
          </p>

          <div className="mb-4 text-left">
            <label
              htmlFor="demo-email"
              className="mb-1 block text-xs uppercase tracking-[0.15em] text-ink-soft"
            >
              Demo email (optional)
            </label>
            <input
              id="demo-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-ink/20 bg-cream px-3 py-2.5 text-sm"
            />
          </div>

          <button
            onClick={handleDemo}
            disabled={loading}
            className="mt-3 w-full border border-sepia px-6 py-3 text-sm font-medium text-sepia transition-colors hover:bg-sepia hover:text-cream disabled:opacity-60"
          >
            Continue with demo account
          </button>

          <button
            onClick={handleOwner}
            disabled={loading}
            className="mt-3 w-full border border-sepia px-6 py-3 text-sm font-medium text-sepia transition-colors hover:bg-sepia hover:text-cream disabled:opacity-60"
          >
            Sign in as store owner → Admin
          </button>

          <p className="mt-4 text-center text-xs text-ink-soft">
            Demo login is enabled on this test build so reviewers can sign in
            without a Google account. Leave the email blank to continue as a
            demo customer.
          </p>
        </div>
      )}
    </div>
  );
}
