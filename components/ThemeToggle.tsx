"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";

/**
 * Light/dark switch.
 *
 * The *applied* theme is set before first paint by the inline script in
 * layout.tsx — this control only reports and changes it. So it renders from
 * `null` until mounted: reading `documentElement.classList` during render would
 * disagree with the server's HTML and trip a hydration mismatch.
 *
 * Choice is persisted; absence of a choice means "follow the system", and that
 * keeps following it live (the media listener below) until the user picks.
 *
 * A deliberate switch cross-fades the whole page through a view transition:
 * the browser snapshots the old page, applies the class swap in one style
 * pass, and fades between the two snapshots on the compositor. Do not go back
 * to transitioning colours per element (the old `.theme-transition *` rule) —
 * every element in flight makes each frame of the fade a whole-page style
 * recompute and repaint, which halved the frame rate on a laptop and, on a
 * mid-range phone, left a freeze followed by a snap.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem("theme")) return; // user has chosen; don't override
      const next: Theme = e.matches ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      setTheme(next);
    };
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";

    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode / blocked storage: the theme still applies for this visit.
    }

    // flushSync so the icon swap is in the DOM before the browser captures the
    // new snapshot — otherwise the old icon would fade in with the new page.
    const apply = () => {
      document.documentElement.classList.toggle("dark", next === "dark");
      flushSync(() => setTheme(next));
    };

    // Fade only for a deliberate switch — never on load, and never for the
    // system-preference path above (which can fire at sunset, unattended).
    // Browsers without view transitions, and reduced motion, switch instantly.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || typeof document.startViewTransition !== "function") {
      apply();
      return;
    }
    document.startViewTransition(apply);
  };

  // Pre-mount: a neutral, same-size placeholder so the nav doesn't reflow when
  // the real control appears.
  if (theme === null) {
    return <span aria-hidden className={`block h-6 w-6 ${className}`} />;
  }

  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
      className={`flex items-center text-ink transition-colors hover:text-sepia ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden
      >
        {dark ? (
          // Sun — the destination, not the current state.
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  );
}
