"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function AccountPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main className="container-x py-24 text-center text-ink-soft">Loading…</main>
    );
  }

  if (!session?.user) {
    return (
      <main className="container-x flex min-h-[50vh] flex-col items-center justify-center gap-5 py-20 text-center">
        <h1 className="font-serif text-4xl font-black">You&apos;re signed out</h1>
        <button onClick={() => signIn()} className="btn-primary">
          Sign in
        </button>
      </main>
    );
  }

  return (
    <main className="container-x py-16">
      <p className="eyebrow">Account</p>
      <h1 className="mt-2 font-serif text-5xl font-black">
        Hello, {session.user.name?.split(" ")[0] ?? "friend"}
      </h1>
      <p className="mt-3 text-ink-soft">{session.user.email}</p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/shop" className="btn-primary">
          Continue shopping
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="btn-outline"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
