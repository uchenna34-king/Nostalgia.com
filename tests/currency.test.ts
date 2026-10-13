import { afterEach, describe, expect, it } from "vitest";
import {
  CURRENCIES,
  CURRENCY_ATTR,
  CURRENCY_COOKIE,
  CURRENCY_COOKIE_MAX_AGE,
  CURRENCY_SCRIPT,
  DEFAULT_CURRENCY,
  RATE_MAX,
  RATE_MIN,
  autoUsdMinor,
  currencyFromCountry,
  effectiveUsdMinor,
  formatMoney,
  isCurrency,
  isValidRate,
  parseCurrency,
  toMinorUnits,
} from "@/lib/currency";

describe("currency allow-list", () => {
  it("knows exactly NGN and USD, NGN first and default", () => {
    expect(CURRENCIES).toEqual(["NGN", "USD"]);
    expect(DEFAULT_CURRENCY).toBe("NGN");
  });

  it("accepts only the exact codes", () => {
    expect(isCurrency("NGN")).toBe(true);
    expect(isCurrency("USD")).toBe(true);
    for (const bad of ["EUR", "ngn", "usd", "", " NGN", undefined, null, 1]) {
      expect(isCurrency(bad)).toBe(false);
    }
  });

  it("parseCurrency returns null for anything off the list", () => {
    expect(parseCurrency("USD")).toBe("USD");
    expect(parseCurrency("EUR")).toBeNull();
    expect(parseCurrency("ngn")).toBeNull();
    expect(parseCurrency("")).toBeNull();
    expect(parseCurrency(undefined)).toBeNull();
  });

  it("maps a country to a default currency (Nigeria or unknown → NGN)", () => {
    expect(currencyFromCountry("NG")).toBe("NGN");
    expect(currencyFromCountry("GB")).toBe("USD");
    expect(currencyFromCountry("US")).toBe("USD");
    expect(currencyFromCountry(null)).toBe("NGN");
    expect(currencyFromCountry(undefined)).toBe("NGN");
    expect(currencyFromCountry("")).toBe("NGN");
  });
});

describe("formatMoney", () => {
  it("prints whole units with the narrow symbol", () => {
    expect(formatMoney(4_500_000, "NGN")).toBe("₦45,000");
    expect(formatMoney(3_500, "USD")).toBe("$35");
    expect(formatMoney(0, "NGN")).toBe("₦0");
    expect(formatMoney(0, "USD")).toBe("$0");
    expect(formatMoney(123_456_789, "NGN")).toBe("₦1,234,568");
  });
});

describe("cookie constants", () => {
  it("are the agreed names and a one-year max age", () => {
    expect(CURRENCY_COOKIE).toBe("nostalgia-currency");
    expect(CURRENCY_ATTR).toBe("data-currency");
    expect(CURRENCY_COOKIE_MAX_AGE).toBe(31_536_000);
  });
});

describe("CURRENCY_SCRIPT (before-paint)", () => {
  const root = document.documentElement;

  function runWithCookie(cookie: string) {
    // jsdom's document.cookie is a real cookie jar; clear then set each pair.
    for (const c of document.cookie.split("; ")) {
      const name = c.split("=")[0];
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
    for (const pair of cookie.split("; ").filter(Boolean)) document.cookie = pair;
    root.removeAttribute(CURRENCY_ATTR);
    // eslint-disable-next-line no-new-func
    new Function(CURRENCY_SCRIPT)();
    return root.getAttribute(CURRENCY_ATTR);
  }

  afterEach(() => root.removeAttribute(CURRENCY_ATTR));

  it("leaves the attribute off with no cookie (CSS default = NGN)", () => {
    expect(runWithCookie("")).toBeNull();
  });

  it("sets NGN or USD from the cookie", () => {
    expect(runWithCookie("nostalgia-currency=NGN")).toBe("NGN");
    expect(runWithCookie("nostalgia-currency=USD")).toBe("USD");
  });

  it("ignores values off the allow-list", () => {
    expect(runWithCookie("nostalgia-currency=EUR")).toBeNull();
    expect(runWithCookie("nostalgia-currency=USDX")).toBeNull();
  });

  it("finds the cookie among others and ignores look-alike names", () => {
    expect(runWithCookie("theme=dark; nostalgia-currency=USD; other=1")).toBe("USD");
    expect(runWithCookie("xnostalgia-currency=USD")).toBeNull();
  });
});

describe("rate rules", () => {
  it("accepts whole naira between the bounds", () => {
    expect(RATE_MIN).toBe(100);
    expect(RATE_MAX).toBe(100_000);
    expect(isValidRate(100)).toBe(true);
    expect(isValidRate(1500)).toBe(true);
    expect(isValidRate(100_000)).toBe(true);
  });

  it("rejects out-of-range, fractional and non-number rates", () => {
    for (const bad of [99, 100_001, 1500.5, NaN, Infinity, "1500", null, undefined]) {
      expect(isValidRate(bad)).toBe(false);
    }
  });
});

// Exact ceil(kobo / (rate*100)) * 100, in BigInt — the oracle the float
// implementation must match exactly.
function oracle(kobo: number, rate: number): number {
  const k = BigInt(kobo);
  const d = BigInt(rate) * 100n;
  return Number(((k + d - 1n) / d) * 100n);
}

describe("autoUsdMinor", () => {
  it("rounds up to the next whole dollar", () => {
    expect(autoUsdMinor(4_500_000, 1500)).toBe(3_000); // ₦45,000 → $30 exactly
    expect(autoUsdMinor(4_500_001, 1500)).toBe(3_100); // one kobo over → $31
    expect(autoUsdMinor(5_000_000, 1550)).toBe(3_300); // 32.26 → $33
    expect(autoUsdMinor(0, 1500)).toBe(0);
    expect(autoUsdMinor(1, 1500)).toBe(100);
    expect(autoUsdMinor(150_000, 1500)).toBe(100); // exactly $1
    expect(autoUsdMinor(150_001, 1500)).toBe(200);
  });

  it("matches the BigInt oracle and never undercharges (seeded fuzz)", () => {
    let seed = 12345;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    for (let i = 0; i < 4000; i++) {
      const rate = RATE_MIN + (next() % (RATE_MAX - RATE_MIN + 1));
      // Up to ₦100,000,000 in kobo, plus exact multiples to hit boundaries.
      const kobo = i % 4 === 0 ? (next() % 1000) * rate * 100 : next() % 10_000_000_000;
      const cents = autoUsdMinor(kobo, rate);
      expect(cents).toBe(oracle(kobo, rate));
      expect(cents % 100).toBe(0);
      // Never under the naira price, and less than one dollar over it.
      expect(cents * rate).toBeGreaterThanOrEqual(kobo);
      expect(cents * rate).toBeLessThan(kobo + 100 * rate);
    }
  });
});

describe("effectiveUsdMinor and toMinorUnits", () => {
  it("prefers the hand-set override, else the rate", () => {
    expect(effectiveUsdMinor(4_500_000, 3_500, 1500)).toBe(3_500);
    expect(effectiveUsdMinor(4_500_000, null, 1500)).toBe(3_000);
    expect(effectiveUsdMinor(4_500_000, 0, 1500)).toBe(0);
  });

  it("converts whole major units to minor units and rejects the rest", () => {
    expect(toMinorUnits(45000)).toBe(4_500_000);
    expect(toMinorUnits("35")).toBe(3_500);
    expect(toMinorUnits(" 0 ")).toBe(0);
    for (const bad of [-1, 1.5, "1.5", "", "abc", NaN, null, undefined, 1e12]) {
      expect(toMinorUnits(bad)).toBeNull();
    }
  });
});
