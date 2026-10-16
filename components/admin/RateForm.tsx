"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveExchangeRate } from "@/app/admin/settings/actions";
import { autoUsdMinor, formatMoney, isValidRate } from "@/lib/currency";

// The migration seeds this rate as a stand-in until the owner sets a real one.
const PLACEHOLDER_RATE = 1500;
// One typo (15000 for 1500) would re-price every dollar price at once, so a
// change bigger than this asks first (UI-SPEC A-13).
const CONFIRM_ABOVE = 0.2;
// The example piece in the live preview: ₦45,000.
const EXAMPLE_KOBO = 4_500_000;

const naira = (rate: number) => formatMoney(rate * 100, "NGN");

function parseRate(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const rate = Number(trimmed);
  return isValidRate(rate) ? rate : null;
}

function impactLine(autoCount: number, fixedCount: number): string {
  const follow =
    autoCount === 0
      ? "No products follow this rate."
      : `${autoCount} ${autoCount === 1 ? "product follows" : "products follow"} this rate and will be re-priced when you save.`;
  if (fixedCount === 0) return follow;
  const fixed =
    fixedCount === 1
      ? "1 has its own dollar price and won't change."
      : `${fixedCount} have their own dollar price and won't change.`;
  return `${follow} ${fixed}`;
}

function savedLine(updated: number): string {
  if (updated === 0) return "Saved. No dollar prices needed updating.";
  if (updated === 1) return "Saved. 1 dollar price updated.";
  return `Saved. ${updated} dollar prices updated.`;
}

/**
 * The store exchange rate (D-05, D-06). Saving re-prices every dollar price
 * that isn't set by hand; the server re-validates the rate and checks the
 * owner, so this form only shapes the input.
 */
export default function RateForm({
  rate,
  autoCount,
  fixedCount,
  updatedLabel,
}: {
  /** Whole naira per $1, as stored. */
  rate: number;
  autoCount: number;
  fixedCount: number;
  /** "13 Oct 2026, 2:05 PM", formatted on the server. */
  updatedLabel?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(rate));
  const [savedRate, setSavedRate] = useState(rate);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const typed = parseRate(value);
  const invalid = typed === null;
  const unchanged = typed === savedRate;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (typed === null || unchanged || saving) return;

    const change = Math.abs(typed - savedRate) / savedRate;
    if (change > CONFIRM_ABOVE) {
      const pct = Math.round(change * 100);
      const ok = window.confirm(
        `Change the rate from ${naira(savedRate)} to ${naira(typed)} per $1? That is a ${pct}% change, and ${autoCount} dollar prices on the storefront will update straight away.`,
      );
      if (!ok) return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const result = await saveExchangeRate(value);
      if (result.ok) {
        setSavedRate(typed);
        setStatus({ ok: true, text: savedLine(result.updated) });
        router.refresh();
      } else {
        setStatus({ ok: false, text: "Couldn't save the rate — try again." });
      }
    } catch {
      setStatus({ ok: false, text: "Couldn't save the rate — try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-6">
        <label
          htmlFor="usdNgnRate"
          className="mb-1 block text-xs uppercase tracking-[0.15em] text-ink-soft"
        >
          ₦ per $1
        </label>
        <input
          id="usdNgnRate"
          type="number"
          inputMode="numeric"
          min={100}
          max={100000}
          step={1}
          required
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setStatus(null);
          }}
          aria-describedby="rate-hint rate-impact"
          aria-invalid={invalid || undefined}
          className="w-full max-w-[10rem] border border-ink/20 bg-cream-dark px-3 py-2 text-sm tabular-nums"
        />
        <p
          id="rate-hint"
          className={`mt-1 text-xs ${invalid ? "text-[#9B2C2C] dark:text-ink" : "text-ink-soft"}`}
        >
          {invalid
            ? "Enter a whole number from 100 to 100,000."
            : "Whole naira, from 100 to 100,000."}
        </p>
        <p id="rate-impact" className="mt-4 text-sm text-ink">
          {impactLine(autoCount, fixedCount)}
        </p>
        {typed !== null && (
          <p className="mt-1 text-sm text-ink-soft">
            At this rate, a {formatMoney(EXAMPLE_KOBO, "NGN")} piece is{" "}
            {formatMoney(autoUsdMinor(EXAMPLE_KOBO, typed), "USD")}.
          </p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary disabled:opacity-60"
            disabled={invalid || unchanged || saving}
          >
            {saving ? "Saving…" : "Save rate"}
          </button>
          {status?.ok && (
            <span role="status" className="text-xs text-sepia">
              {status.text}
            </span>
          )}
          {status && !status.ok && (
            <span role="alert" className="text-xs text-[#9B2C2C] dark:text-ink">
              {status.text}
            </span>
          )}
        </div>
      </form>
      {updatedLabel && (
        <p className="mt-6 text-xs text-ink-soft">Last updated {updatedLabel}</p>
      )}
      {savedRate === PLACEHOLDER_RATE && (
        <p className="mt-2 text-xs text-ink-soft">
          {naira(PLACEHOLDER_RATE)} is the starting placeholder rate. Check it against
          today&apos;s rate before you launch.
        </p>
      )}
    </>
  );
}
