"use client";

import { useState } from "react";

/**
 * The capture block â€” MOVE's "join the community" newsletter, reworked as an
 * archive register on the page ground (cream/ink) so it inverts with the theme.
 * No backend yet (this is a front-end pass): a valid address flips to an
 * on-brand acknowledgement client-side. Wire the submit to the real list when
 * the mailing backend lands.
 */
export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="reveal border-t border-ink/10 bg-cream text-ink">
      <div className="container-x grid gap-12 py-24 md:grid-cols-2 md:items-center md:py-32">
        <div>
          <p className="kicker">The register</p>
          <h2 className="mt-5 max-w-md text-balance font-serif font-normal leading-[1.03] text-[clamp(2rem,4.5vw,3.5rem)]">
            First to the one-of-ones.
          </h2>
          <p className="measure mt-7 max-w-[46ch]">
            New drops are single pieces. Join the register for early access,
            authentication notes, and the occasional letter from the house.
          </p>
        </div>

        <div className="min-w-0 md:justify-self-end md:w-full md:max-w-sm">
          {done ? (
            <p
              role="status"
              className="border border-ink/25 px-6 py-7 text-[16px] leading-[1.7] text-ink"
            >
              You&rsquo;re on the register. Watch your inbox for the next
              one-of-one.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.includes("@")) setDone(true);
              }}
              className="flex flex-col gap-3"
            >
              <label htmlFor="nl-email" className="sr-only">
                Email address
              </label>
              <div className="flex min-w-0 overflow-hidden rounded-full border border-ink/25 focus-within:border-ink/60">
                <input
                  id="nl-email"
                  type="email"
                  size={1}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="min-w-0 flex-1 bg-transparent px-6 py-3.5 text-[16px] text-ink placeholder:text-ink-soft focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-ink px-6 text-[12px] font-medium uppercase tracking-[0.14em] text-cream transition-opacity hover:opacity-90"
                >
                  Join
                </button>
              </div>
              <p className="text-[12px] text-ink-soft">
                One or two letters a month. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
