import Link from "next/link";
import SignInForm from "@/components/SignInForm";
import { googleEnabled } from "@/lib/auth";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const callbackUrl = searchParams.callbackUrl ?? "/";

  return (
    <main className="container-x flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <p className="eyebrow">The House of Nostalgia</p>
      <h1 className="mt-3 font-serif text-5xl font-black">Welcome back</h1>
      <p className="mt-3 max-w-sm text-ink-soft">
        Sign in to keep your bag, track orders, and check out.
      </p>

      <div className="mt-10 flex justify-center">
        <SignInForm googleEnabled={googleEnabled} callbackUrl={callbackUrl} />
      </div>

      <Link
        href="/shop"
        className="mt-10 text-xs uppercase tracking-[0.18em] text-ink-soft underline"
      >
        Keep browsing
      </Link>
    </main>
  );
}
