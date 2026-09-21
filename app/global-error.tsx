"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary. This is the ONLY thing that can catch a failure in the
 * root layout itself — a broken font load, a throw in Providers/AppFrame —
 * because at that point the layout (and therefore app/error.tsx, which renders
 * inside it) is exactly what is unavailable.
 *
 * For that reason it must supply its own <html> and <body>, and must NOT
 * import the house font, the global stylesheet, or any shared chrome: the
 * whole point is to survive when those are what broke. The styles below are
 * inline and self-contained, and mirror the house palette by hand
 * (cream/ink, plus the dark-mode inversion) rather than via Tailwind tokens.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[nostalgia] root layout failed:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem 1.25rem",
          textAlign: "center",
          background: "#faf8f4",
          color: "#171717",
          fontFamily: "Didot, 'Bodoni MT', Georgia, serif",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#595959",
          }}
        >
          Nostalgia
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(2.5rem, 10vw, 4.5rem)",
            fontWeight: 400,
            lineHeight: 1,
          }}
        >
          Out of service
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: "28rem",
            lineHeight: 1.6,
            color: "#595959",
          }}
        >
          The site failed to start up. If you are running this locally, check
          the dev server terminal — the underlying error is printed there.
        </p>

        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            border: "none",
            borderRadius: "9999px",
            background: "#171717",
            color: "#faf8f4",
            padding: "0.85rem 1.9rem",
            fontSize: "13px",
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Try again
        </button>

        {error.digest ? (
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#595959",
            }}
          >
            Reference {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
