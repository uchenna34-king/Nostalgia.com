import Link from "next/link";
import type { Metadata } from "next";
import { completeRegistration, type VerifyOutcome } from "@/lib/registration";
import { safeCallbackUrl } from "@/lib/registration-rules";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false },
};

const COPY: Record<VerifyOutcome, { heading: string; body: string }> = {
  verified: {
    heading: "Your account is ready",
    body: "Your email is verified. Sign in with your email and password to continue.",
  },
  exists: {
    heading: "You already have an account",
    body: "This email is already registered. Sign in to continue.",
  },
  expired: {
    heading: "This link has expired",
    body: "Verification links last 24 hours. Sign up again and we'll send a fresh one.",
  },
  invalid: {
    heading: "This link isn't valid",
    body: "It may have been used already. Try signing in, or sign up again for a new link.",
  },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { token?: string; callbackUrl?: string };
}) {
  const outcome = await completeRegistration(searchParams.token);
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl);
  const { heading, body } = COPY[outcome];
  const canSignIn = outcome === "verified" || outcome === "exists";

  return (
    <main className="container-x flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="eyebrow">The House of Nostalgia</p>
      <h1 className="mt-3 font-serif text-4xl font-normal">{heading}</h1>
      <p className="mt-3 max-w-sm text-ink-soft">{body}</p>
      <Link
        href={
          canSignIn
            ? `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
            : `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
        }
        className="btn-primary mt-8"
      >
        {canSignIn ? "Sign in" : "Sign up again"}
      </Link>
    </main>
  );
}
