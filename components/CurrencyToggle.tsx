"use client";

import { useState } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import { CURRENCIES, CURRENCY_LABELS, CURRENCY_NAMES, type Currency } from "@/lib/currency";

const SYMBOL: Record<Currency, string> = { NGN: "₦", USD: "$" };
const ANNOUNCE: Record<Currency, string> = {
  NGN: "Prices now shown in naira (₦ NGN).",
  USD: "Prices now shown in US dollars ($ USD).",
};

/**
 * ₦ / $ switch (D-11, UI-SPEC Surface 1). `bar` sits beside ThemeToggle on
 * desktop; `menu` is the block at the foot of the mobile sheet. Like
 * ThemeToggle it renders a same-size placeholder until mounted, because the
 * active currency is only known from <html data-currency> in the browser.
 */
export default function CurrencyToggle({
  variant,
  tabIndex,
}: {
  variant: "bar" | "menu";
  /** For the mobile sheet: -1 while it is closed, like its links. */
  tabIndex?: number;
}) {
  const { currency, setCurrency } = useCurrency();
  const [announcement, setAnnouncement] = useState("");

  function choose(next: Currency) {
    if (next === currency) return;
    setCurrency(next);
    setAnnouncement(ANNOUNCE[next]);
  }

  const status = (
    <span role="status" className="sr-only">
      {announcement}
    </span>
  );

  if (variant === "bar") {
    if (currency === null) {
      return <span aria-hidden className="hidden h-6 w-16 lg:block xl:w-28" />;
    }
    return (
      <div role="group" aria-label="Currency" className="hidden items-center lg:inline-flex">
        {CURRENCIES.map((c) => {
          const active = c === currency;
          return (
            <button
              key={c}
              type="button"
              onClick={() => choose(c)}
              aria-pressed={active}
              aria-label={`${CURRENCY_LABELS[c]}, ${CURRENCY_NAMES[c]}`}
              className={`inline-flex h-6 w-8 items-center justify-center rounded-full text-[13px] font-medium tracking-[0.01em] transition-colors xl:w-14 ${
                active ? "bg-ink text-cream" : "text-ink-soft hover:text-ink"
              }`}
            >
              <span aria-hidden>{SYMBOL[c]}</span>
              <span aria-hidden className="hidden xl:inline">
                &nbsp;{c}
              </span>
            </button>
          );
        })}
        {status}
      </div>
    );
  }

  return (
    <div className="border-t border-ink/10 pb-3 pt-6">
      <p id="currency-menu-label" className="eyebrow mb-3">
        Currency
      </p>
      <div role="group" aria-labelledby="currency-menu-label" className="grid grid-cols-2 gap-2">
        {CURRENCIES.map((c) => {
          const active = currency !== null && c === currency;
          return (
            <button
              key={c}
              type="button"
              tabIndex={tabIndex}
              onClick={() => choose(c)}
              aria-pressed={active}
              aria-label={`${CURRENCY_LABELS[c]}, ${CURRENCY_NAMES[c]}`}
              className={`flex min-h-11 items-center justify-center border text-[13px] font-medium tracking-[0.01em] transition-colors ${
                active ? "border-ink bg-ink text-cream" : "border-ink/25 text-ink hover:border-ink"
              }`}
            >
              {CURRENCY_LABELS[c]}
            </button>
          );
        })}
      </div>
      {status}
    </div>
  );
}
