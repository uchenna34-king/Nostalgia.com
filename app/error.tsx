"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary. Without this file ANY throw inside a server
 * component — most commonly Prisma failing to reach the hosted Postgres when
 * the machine is offline — escapes as a bare HTTP 500 with Next's unstyled
 * default screen. Every page here is an async server component that queries
 * the catalogue, so that single missing boundary is what turns "no network"
 * into a 500 on the whole site.
 *
 * This keeps the house frame and offers the one thing the default screen does
 * not: reset(), which re-runs the failed render without a full reload, so the
 * page recovers the moment the connection comes back.
 *
 * Note this boundary can only catch errors thrown BELOW the root layout. A
 * failure in the layout itself (or in the font it loads) is caught by
 * app/global-error.tsx instead.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-component errors arrive here already redacted in production
    // (message replaced, `digest` kept). Logging keeps the real cause visible
    // in the dev terminal, where it is actionable.
    console.error("[nostalgia] render failed:", error);
  }, [error]);

  // Prisma's connection failures are the offline case, and they need different
  // words from a genuine bug: nothing is broken, the data just isn't reachable.
  const isOffline =
    /PrismaClientInitializationError|Can't reach database server|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(
      `${error.name} ${error.message}`,
    );

  return (
    <main className="container-x flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">
        {isOffline ? "The archive is unreachable" : "Something came apart"}
      </p>

      <h1 className="mt-3 font-serif text-6xl font-normal sm:text-7xl">
        {isOffline ? "Offline" : "Error"}
      </h1>

      <p className="mt-4 max-w-md text-ink-soft">
        {isOffline
          ? "We can't reach the catalogue right now. This is usually a dropped connection rather than a fault on the site — it should return on its own."
          : "This page didn't finish loading. The fault has been logged; trying again will often clear it."}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-outline">
          Return home
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-8 text-[11px] uppercase tracking-[0.25em] text-ink-soft">
          Reference {error.digest}
        </p>
      ) : null}
    </main>
  );
}
