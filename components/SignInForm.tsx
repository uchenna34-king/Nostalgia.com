"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import GoogleButton from "@/components/GoogleButton";

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
        <GoogleButton
          callbackUrl={callbackUrl}
          disabled={loading}
          onStart={() => setLoading(true)}
        />
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
