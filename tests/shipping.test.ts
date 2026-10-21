import { describe, expect, it } from "vitest";
import {
  FREE_SHIPPING_OVER,
  SHIPPING_RATES,
  calculateShipping,
  zoneFor,
} from "@/lib/shipping";
import { CURRENCIES } from "@/lib/currency";

// Placeholder rates (D-16), in minor units, until the owner confirms them.
describe("SHIPPING_RATES", () => {
  it("prices both zones in both currencies", () => {
    expect(SHIPPING_RATES).toEqual({
      domestic: {
        NGN: { fee: 500_000, freeOver: 25_000_000 },
        USD: { fee: 500, freeOver: 20_000 },
      },
      international: {
        NGN: { fee: 6_000_000, freeOver: 75_000_000 },
        USD: { fee: 4_000, freeOver: 50_000 },
      },
    });
  });

  it("exposes the domestic free-delivery thresholds for storefront copy", () => {
    expect(FREE_SHIPPING_OVER).toEqual({
      domestic: { NGN: 25_000_000, USD: 20_000 },
      international: { NGN: 75_000_000, USD: 50_000 },
    });
  });
});

describe("zoneFor", () => {
  it("treats Nigeria as domestic and everywhere else as international", () => {
    expect(zoneFor("NG")).toBe("domestic");
    expect(zoneFor("GB")).toBe("international");
    expect(zoneFor("US")).toBe("international");
  });
});

describe("calculateShipping(subtotal, currency, country)", () => {
  const cases = (["domestic", "international"] as const).flatMap((zone) =>
    CURRENCIES.map((currency) => [zone, currency] as const),
  );

  it.each(cases)("%s / %s: the fee below the threshold, free at and above it", (zone, currency) => {
    const country = zone === "domestic" ? "NG" : "GB";
    const { fee, freeOver } = SHIPPING_RATES[zone][currency];
    expect(calculateShipping(0, currency, country)).toBe(fee);
    expect(calculateShipping(freeOver - 1, currency, country)).toBe(fee);
    expect(calculateShipping(freeOver, currency, country)).toBe(0);
    expect(calculateShipping(freeOver + 1, currency, country)).toBe(0);
  });

  it("never mixes a naira subtotal with a dollar threshold", () => {
    // ₦200 (20,000 kobo) is far below the ₦250,000 domestic threshold, even
    // though 20,000 is exactly the dollar threshold in cents.
    expect(calculateShipping(20_000, "NGN", "NG")).toBe(500_000);
  });
});
