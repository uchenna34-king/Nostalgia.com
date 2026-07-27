"use client";

import { useEffect, useState } from "react";
import { getConsent, setConsent } from "@/lib/analytics";

/**
 * Cookie-consent banner (UI-SPEC §4, D-10). A non-modal, non-CLS bottom bar:
 * position:fixed (reserves no space), revealed only post-mount when no choice
 * has been made. NOT a dialog — no aria-modal, no focus trap, no backdrop; a
 * shopper can tab past it and keep browsing or checking out.
 */
export default function ConsentBanner() {
  // Starts hidden so the server and first client paint render nothing (no
  // hydration flash, zero layout shift). The post-mount effect reveals it.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  function choose(value: "accepted" | "declined") {
    setConsent(value); // writes localStorage + dispatches the consent-change event
    setVisible(false);
  }

  return (
    <aside
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-40 translate-y-0 bg-ink text-cream transition-transform motion-reduce:transition-none"
    >
      <div className="container-x flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-cream/90">
          We use cookie-free analytics to see what&apos;s working. No personal
          data, no ads.
        </p>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="text-sm text-cream/70 underline hover:text-cream"
          >
            No thanks
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="bg-cream px-8 py-3.5 text-sm font-medium uppercase tracking-widest text-ink hover:bg-cream-dark"
          >
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
}
