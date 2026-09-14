"use client";

import { signIn, signOut } from "next-auth/react";

/**
 * Signed-out branch of /account, relocated (not redesigned) from the former
 * "use client" account page so getServerSession can take over data-fetching
 * server-side. signIn()/signOut() from next-auth/react are browser-side
 * calls a Server Component cannot invoke — this file is the only client
 * code left on the /account route. The page owns the <main> landmark; this
 * renders a plain <div>.
 */
export function AccountSignedOut() {
  return (
    <div className="container-x flex min-h-[50vh] flex-col items-center justify-center gap-5 py-20 text-center">
      <h1 className="font-serif text-4xl font-normal tracking-[-0.02em]">You&apos;re signed out</h1>
      <button onClick={() => signIn()} className="btn-primary">
        Sign in
      </button>
    </div>
  );
}

export function AccountSignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="btn-outline"
    >
      Sign out
    </button>
  );
}
