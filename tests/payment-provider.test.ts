// @vitest-environment node
import { describe, expect, it } from "vitest";
import { demoCheckoutAllowed, resolveProvider } from "@/lib/payment-provider";

describe("resolveProvider", () => {
  it("always sends naira to Paystack", () => {
    expect(resolveProvider("NGN", {})).toBe("paystack");
    expect(resolveProvider("NGN", { USD_PAYMENT_PROVIDER: "stripe" })).toBe("paystack");
  });

  it("sends dollars to Stripe unless the switch is exactly 'paystack'", () => {
    expect(resolveProvider("USD", {})).toBe("stripe");
    expect(resolveProvider("USD", { USD_PAYMENT_PROVIDER: "paystack" })).toBe("paystack");
    for (const v of ["Paystack", " paystack", "paystack ", "PAYSTACK", "true", ""]) {
      expect(resolveProvider("USD", { USD_PAYMENT_PROVIDER: v })).toBe("stripe");
    }
  });
});

describe("demoCheckoutAllowed", () => {
  it("is closed on production unless the flag is exactly 'true'", () => {
    expect(demoCheckoutAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(demoCheckoutAllowed({ NODE_ENV: "production", ALLOW_DEMO_CHECKOUT: "true" })).toBe(true);
    for (const v of ["TRUE", "True", "1", "yes", " true", ""]) {
      expect(demoCheckoutAllowed({ NODE_ENV: "production", ALLOW_DEMO_CHECKOUT: v })).toBe(false);
    }
  });

  it("is open outside production", () => {
    expect(demoCheckoutAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(demoCheckoutAllowed({ NODE_ENV: "test" })).toBe(true);
    expect(demoCheckoutAllowed({})).toBe(true);
  });
});
