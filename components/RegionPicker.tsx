"use client";

import { useCallback, useState } from "react";
import { useCurrency, type Preferences } from "@/context/CurrencyContext";
import RegionDialog from "@/components/RegionDialog";
import { countryName } from "@/lib/countries";
import { CURRENCY_LABELS, CURRENCY_NAMES, type Currency } from "@/lib/currency";

const SYMBOL: Record<Currency, string> = { NGN: "₦", USD: "$" };

/** "Now shipping to Ghana, with prices in US dollars ($ USD)." */
function announcement({ region, currency }: Preferences): string {
  return `Now shipping to ${countryName(region)}, with prices in ${CURRENCY_NAMES[currency]} (${CURRENCY_LABELS[currency]}).`;
}

/**
 * Where the order ships and what it's paid in (D-33, 12-REGION-SPEC.md),
 * opening the region and currency dialog. `bar` sits beside ThemeToggle from
 * lg, `menu` is the block at the foot of the mobile sheet, `footer` sits in
 * the footer's bottom bar. Like ThemeToggle it renders a same-size
 * placeholder until mounted: both values are only known in the browser.
 */
export default function RegionPicker({
  variant,
  tabIndex,
}: {
  variant: "bar" | "menu" | "footer";
  /** For the mobile sheet: -1 while it is closed, like its links. */
  tabIndex?: number;
}) {
  const { currency, region, setPreferences } = useCurrency();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");

  const close = useCallback(() => setOpen(false), []);
  const save = useCallback(
    (next: Preferences) => {
      setPreferences(next);
      setStatus(announcement(next));
    },
    [setPreferences],
  );

  if (currency === null || region === null) {
    if (variant === "bar") return <span aria-hidden className="hidden h-6 w-14 lg:block xl:w-[5.5rem]" />;
    if (variant === "menu") {
      return (
        <div aria-hidden className="border-t border-ink/10 pb-3 pt-6">
          <p className="eyebrow mb-3">Region and currency</p>
          <span className="block min-h-11 border border-ink/25" />
        </div>
      );
    }
    return <span aria-hidden />;
  }

  const shipTo = `Ship to ${countryName(region)} · ${CURRENCY_LABELS[currency]}`;
  // The same words; "· $ USD" stays on one line when a long country name wraps.
  const shipToText = (
    <>
      Ship to {countryName(region)}{" "}
      <span className="whitespace-nowrap">· {CURRENCY_LABELS[currency]}</span>
    </>
  );
  const live = (
    <span role="status" className="sr-only">
      {status}
    </span>
  );
  const dialog = (
    <RegionDialog open={open} initial={{ region, currency }} onSave={save} onClose={close} />
  );

  if (variant === "bar") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={`${region} · ${CURRENCY_LABELS[currency]}, ship to ${countryName(region)}, prices in ${CURRENCY_NAMES[currency]}`}
          className="link-underline hidden h-6 w-14 items-center whitespace-nowrap text-[13px] font-medium tracking-[0.01em] text-ink-soft hover:text-ink lg:inline-flex xl:w-[5.5rem]"
        >
          {/* One flex item, so the xl code reads on as part of the same text. */}
          <span>
            {region} · {SYMBOL[currency]}
            <span className="hidden xl:inline">&nbsp;{currency}</span>
          </span>
        </button>
        {live}
        {dialog}
      </>
    );
  }

  if (variant === "menu") {
    return (
      <div className="border-t border-ink/10 pb-3 pt-6">
        <p className="eyebrow mb-3">Region and currency</p>
        <button
          type="button"
          tabIndex={tabIndex}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={`${shipTo}, change region and currency`}
          className="flex min-h-11 w-full items-center justify-between gap-4 border border-ink/25 px-4 py-2 text-left text-[13px] font-medium tracking-[0.01em] text-ink transition-colors hover:border-ink"
        >
          <span>{shipToText}</span>
          <span className="text-ink-soft">Change</span>
        </button>
        {live}
        {dialog}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${shipTo}, change region and currency`}
        className="link-underline transition-colors hover:text-ink"
      >
        {shipToText}
      </button>
      {live}
      {dialog}
    </>
  );
}
