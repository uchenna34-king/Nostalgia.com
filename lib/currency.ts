// Pure, Prisma-free money module (D-01, D-02, D-04, D-05, D-09, D-10). Imported
// by Edge middleware, client components and the email builder, so it must stay
// free of Prisma, Node-only APIs and react.cache — mirrors lib/orders.ts.
//
// Every amount in the system is an integer in MINOR units (kobo / cents, both
// 1/100). Catalog prices and shipping constants are whole major units, which is
// why formatMoney drops fractions.

export const CURRENCIES = ["NGN", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Naira is the brand's home currency: the default everywhere. */
export const DEFAULT_CURRENCY: Currency = "NGN";

const CURRENCY_SET = new Set<string>(CURRENCIES);

/** Allow-list guard (same idiom as isValidOrderStatus). Exact codes only. */
export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && CURRENCY_SET.has(value);
}

/** The currency for an untrusted value, or null when it is off the list. */
export function parseCurrency(value: unknown): Currency | null {
  return isCurrency(value) ? value : null;
}

/** First-visit default from a country code: Nigeria (or unknown) → NGN. */
export function currencyFromCountry(country: string | null | undefined): Currency {
  if (!country || country === "NG") return "NGN";
  return "USD";
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  NGN: "₦ NGN",
  USD: "$ USD",
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  NGN: "Nigerian naira",
  USD: "US dollars",
};

// "en-US" + narrowSymbol is the only combination that prints both "₦45,000"
// and "$35" (en-NG prints "US$35"; en-US default prints "NGN 45,000").
const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  NGN: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NGN",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
};

/** "₦45,000" / "$35" from minor units. The only money formatter in the app. */
export function formatMoney(amountMinor: number, currency: Currency): string {
  return FORMATTERS[currency].format(amountMinor / 100);
}

// ---- Shopper's currency choice (D-09, D-10) ----

export const CURRENCY_COOKIE = "nostalgia-currency";
export const CURRENCY_ATTR = "data-currency";
export const CURRENCY_COOKIE_MAX_AGE = 31_536_000; // one year, in seconds

/**
 * Blocking <head> script: copies the cookie onto <html data-currency> before
 * first paint, so CSS shows the right <Money> span with no flash. Same idiom
 * as THEME_SCRIPT / SESSION_HINT_SCRIPT. The regex is the allow-list; try/catch
 * because document.cookie throws in some sandboxed contexts. No attribute
 * means NGN.
 */
export const CURRENCY_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${CURRENCY_COOKIE}=(NGN|USD)(?:;|$)/);if(m)document.documentElement.setAttribute("${CURRENCY_ATTR}",m[1])}catch(e){}})()`;

// ---- Store exchange rate and dollar prices (D-04, D-05) ----

/** Whole naira per $1. */
export const RATE_MIN = 100;
export const RATE_MAX = 100_000;

export function isValidRate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= RATE_MIN &&
    value <= RATE_MAX
  );
}

/**
 * Auto dollar price for a naira price: naira ÷ rate, rounded UP to the next
 * whole dollar so it never undercharges against the naira price. kobo / rate
 * is cents, and one division of two integers is exact whenever the true
 * quotient is an integer, so Math.ceil cannot be pushed over a boundary by
 * float error. The SQL bulk recompute (lib/settings.ts) mirrors this exactly.
 */
export function autoUsdMinor(priceNgnMinor: number, rate: number): number {
  return Math.ceil(priceNgnMinor / (rate * 100)) * 100;
}

/** The dollar price a product sells at: the hand-set override, else the rate. */
export function effectiveUsdMinor(
  priceNgnMinor: number,
  priceUsdOverrideMinor: number | null,
  rate: number,
): number {
  return priceUsdOverrideMinor ?? autoUsdMinor(priceNgnMinor, rate);
}

/**
 * Largest amount a Postgres INTEGER column holds (minor units): about
 * ₦21.4 million or $21.4 million. Prices and order totals must stay at or
 * under it.
 */
export const MAX_MINOR = 2_147_483_647;

/**
 * Whole major units ("45000", 35) → minor units, or null for anything that is
 * not a non-negative whole number that fits in MAX_MINOR. Owner inputs are
 * always in naira/dollars, never kobo/cents (D-07).
 */
export function toMinorUnits(major: unknown): number | null {
  let n: number;
  if (typeof major === "number") n = major;
  else if (typeof major === "string" && /^\s*\d+\s*$/.test(major)) n = Number(major);
  else return null;
  if (!Number.isInteger(n) || n < 0) return null;
  const minor = n * 100;
  return minor <= MAX_MINOR ? minor : null;
}
