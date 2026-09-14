"use client";

import { useState } from "react";

/**
 * The capture block — MOVE's "join the community" newsletter, reworked as an
 * archive register on flat black (shade/light) so it holds the page's close.
 * No backend yet (this is a front-end pass): a valid address flips to an
 * on-brand acknowledgement client-side. Wire the submit to the real list when
 * the mailing backend lands.
 */
export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="reveal bg-shade text-light">
      <div className="container-x grid gap-10 py-20 md:grid-cols-2 md:items-center md:py-28">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-sepia-light">
            The register
          </p>
          <h2 className="mt-6 max-w-md font-serif font-normal leading-[1.03] tracking-[-0.02em] text-[clamp(2rem,4.5vw,3.5rem)]">
            First to the one-of-ones.
          </h2>
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-light/65">
            New drops are single pieces. Join the register for early access,
            authentication notes, and the occasional letter from the house.
          </p>
        </div>

        <div className="md:justify-self-end md:w-full md:max-w-sm">
          {done ? (
            <p
              role="status"
              className="rounded-[4px] border border-light/20 px-5 py-6 text-[14px] leading-relaxed text-light/85"
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
              <div className="flex overflow-hidden rounded-full border border-light/25 focus-within:border-light/60">
                <input
                  id="nl-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="min-w-0 flex-1 bg-transparent px-5 py-3 text-[14px] text-light placeholder:text-light/45 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-light px-6 text-[12px] font-medium uppercase tracking-[0.14em] text-shade transition-opacity hover:opacity-90"
                >
                  Join
                </button>
              </div>
              <p className="text-[11px] text-light/45">
                One or two letters a month. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
