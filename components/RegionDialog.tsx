"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { Preferences } from "@/context/CurrencyContext";
import { countryName, countryOptions } from "@/lib/countries";
import {
  CURRENCIES,
  CURRENCY_LABELS,
  CURRENCY_NAMES,
  currencyFromCountry,
  formatMoney,
  type Currency,
} from "@/lib/currency";
import { SHIPPING_RATES, zoneFor } from "@/lib/shipping";

// The address form's label and control styles (12-REGION-SPEC.md).
const LABEL = "mb-1 block text-xs uppercase tracking-[0.15em] text-ink-soft";
const CONTROL = "w-full border border-ink/25 bg-cream px-3 py-3 text-sm text-ink focus:border-ink";

/** "Delivery to Ghana: $40, free on orders over $500." from lib/shipping. */
export function deliveryLine(region: string, currency: Currency): string {
  const { fee, freeOver } = SHIPPING_RATES[zoneFor(region)][currency];
  const price = fee === 0 ? "Free" : formatMoney(fee, currency);
  return `Delivery to ${countryName(region)}: ${price}, free on orders over ${formatMoney(freeOver, currency)}.`;
}

/**
 * Region and currency dialog (D-33). Renders nothing when closed. Same dialog
 * contract as SizeGuideModal (focus in, Tab trap, Escape, scroll lock, focus
 * back to the trigger), through a portal on <body>: the nav's glass panel
 * would otherwise contain the fixed overlay. Saving hands both choices back
 * in one call; the picker applies and announces them.
 */
export default function RegionDialog({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: Preferences;
  /** Called only when something changed; the dialog closes either way. */
  onSave: (next: Preferences) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  // Mounted per open, so the draft below always starts from the saved choice.
  return createPortal(<Panel initial={initial} onSave={onSave} onClose={onClose} />, document.body);
}

function Panel({
  initial,
  onSave,
  onClose,
}: {
  initial: Preferences;
  onSave: (next: Preferences) => void;
  onClose: () => void;
}) {
  const [region, setRegion] = useState(initial.region);
  const [currency, setCurrency] = useState(initial.currency);
  // The currency follows the country until the shopper picks one; a saved
  // currency that isn't its country's usual one was picked already.
  const [picked, setPicked] = useState(initial.currency !== currencyFromCountry(initial.region));
  const countries = useMemo(() => countryOptions(), []);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const id = useId();
  const headingId = `${id}-heading`;
  const selectId = `${id}-country`;
  const deliveryId = `${id}-delivery`;
  // Latest onClose without re-running the effect below, which would move focus.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const restore = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    selectRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (restore instanceof HTMLElement && document.contains(restore)) restore.focus();
    };
  }, []);

  const chooseRegion = (next: string) => {
    setRegion(next);
    if (!picked) setCurrency(currencyFromCountry(next));
  };

  const chooseCurrency = (next: Currency) => {
    setCurrency(next);
    setPicked(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (region !== initial.region || currency !== initial.currency) onSave({ region, currency });
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-[60] bg-ink/40 transition-opacity motion-reduce:transition-none"
      />

      {/* Centred on sm+, bottom sheet under 640px. The layer lets clicks
          beside the panel through to the backdrop. */}
      <div className="pointer-events-none fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          className="pointer-events-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-xl border border-ink/10 bg-cream shadow-xl sm:rounded-xl"
        >
          <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
            <h2 id={headingId} className="font-serif text-2xl font-normal">
              Region and currency
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close region and currency"
              className="-mr-2 flex h-11 w-11 items-center justify-center text-2xl leading-none text-ink hover:text-sepia"
            >
              ×
            </button>
          </div>

          <form onSubmit={submit} className="px-6 pb-6 pt-5">
            <p className="text-sm text-ink-soft">
              Choose where your order is going and the currency you&apos;d like to pay in.
            </p>

            <div className="mt-6">
              <label htmlFor={selectId} className={LABEL}>
                Ship to
              </label>
              <select
                ref={selectRef}
                id={selectId}
                value={region}
                aria-describedby={deliveryId}
                onChange={(e) => chooseRegion(e.target.value)}
                className={CONTROL}
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              {/* Polite: a country change can move the currency too, and this
                  line is where that shows. */}
              <p id={deliveryId} aria-live="polite" className="mt-2 text-xs text-ink-soft">
                {deliveryLine(region, currency)}
              </p>
            </div>

            <fieldset className="mt-6 min-w-0 border-0 p-0">
              <legend className={LABEL}>Currency</legend>
              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map((c) => {
                  const checked = c === currency;
                  return (
                    <label key={c} className="relative block cursor-pointer">
                      <input
                        type="radio"
                        name={`${id}-currency`}
                        value={c}
                        checked={checked}
                        onChange={() => chooseCurrency(c)}
                        // The chip that's already on fires no change, but
                        // choosing it is still a pick: keep it from here on.
                        onClick={() => setPicked(true)}
                        className="peer sr-only"
                      />
                      <span
                        className={`flex min-h-11 flex-col items-center justify-center border px-3 py-2 text-center transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sepia ${
                          checked ? "border-ink bg-ink text-cream" : "border-ink/25 text-ink hover:border-ink"
                        }`}
                      >
                        <span className="text-[13px] font-medium tracking-[0.01em]">{CURRENCY_LABELS[c]}</span>
                        <span className={`text-xs ${checked ? "text-cream/75" : "text-ink-soft"}`}>
                          {CURRENCY_NAMES[c]}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-ink-soft">Prices, delivery and checkout use this currency.</p>
            </fieldset>

            <button type="submit" className="btn-primary mt-7 w-full">
              Save
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
