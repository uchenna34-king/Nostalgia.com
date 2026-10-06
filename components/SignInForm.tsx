"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
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

      {!googleEnabled && !demoEnabled && (
        <p role="alert" className="text-sm text-ink-soft">
          Sign-in isn&rsquo;t available right now. Please try again later.
        </p>
      )}

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
