import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_REGION,
  REGION_COOKIE,
  REGION_SCRIPT,
  ZONE_ATTR,
  parseRegion,
  readRegionCookie,
  regionFromCountry,
} from "@/lib/region";
import { SHIPPABLE_COUNTRY_CODES, UNSHIPPABLE_COUNTRIES } from "@/lib/countries";
import { zoneFor } from "@/lib/shipping";

// The ship-to region (D-33, 12-REGION-SPEC.md): a shippable ISO country code
// in the nostalgia-region cookie. Same allow-list discipline as the currency:
// anything off the list is never used.

describe("parseRegion", () => {
  it("accepts every shippable country", () => {
    for (const code of SHIPPABLE_COUNTRY_CODES) expect(parseRegion(code), code).toBe(code);
  });

  it.each([...UNSHIPPABLE_COUNTRIES, "ng", "NGA", "ZZ", "EU", "UK", "", " NG", undefined, null, 1])(
    "rejects %j",
    (value) => {
      expect(parseRegion(value)).toBeNull();
    },
  );
});

describe("regionFromCountry (first-visit default)", () => {
  it("uses the visitor's country when we ship there", () => {
    expect(regionFromCountry("NG")).toBe("NG");
    expect(regionFromCountry("GH")).toBe("GH");
    expect(regionFromCountry("US")).toBe("US");
  });

  it.each([null, undefined, "", "XX", "KP", "gb"])("falls back to Nigeria for %j", (country) => {
    expect(regionFromCountry(country)).toBe(DEFAULT_REGION);
    expect(DEFAULT_REGION).toBe("NG");
  });
});

describe("readRegionCookie", () => {
  it("finds the region among other cookies", () => {
    expect(readRegionCookie(`a=1; ${REGION_COOKIE}=GH; nostalgia-currency=USD`)).toBe("GH");
    expect(readRegionCookie(`${REGION_COOKIE}=US`)).toBe("US");
  });

  it.each([
    "",
    "nostalgia-currency=NGN",
    `${REGION_COOKIE}=`,
    `${REGION_COOKIE}=ZZ`,
    `${REGION_COOKIE}=KP`,
    `${REGION_COOKIE}=gh`,
    `x${REGION_COOKIE}=GH`,
  ])("is null for %j", (cookies) => {
    expect(readRegionCookie(cookies)).toBeNull();
  });
});

describe("REGION_SCRIPT (before first paint)", () => {
  const root = document.documentElement;
  const clearCookies = () => {
    for (const c of document.cookie.split("; ")) {
      const name = c.split("=")[0];
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`;
    }
  };
  const run = () => new Function(REGION_SCRIPT)();

  beforeEach(() => {
    clearCookies();
    root.removeAttribute(ZONE_ATTR);
  });

  it("marks a non-Nigerian region international", () => {
    document.cookie = `${REGION_COOKIE}=GH; Path=/`;
    run();
    expect(root.getAttribute(ZONE_ATTR)).toBe("international");
  });

  it("leaves Nigeria, no cookie, and junk as domestic (no attribute)", () => {
    for (const value of ["NG", null, "ng", "G", "GHA", "<x>"]) {
      clearCookies();
      root.removeAttribute(ZONE_ATTR);
      if (value !== null) document.cookie = `${REGION_COOKIE}=${value}; Path=/`;
      run();
      expect(root.hasAttribute(ZONE_ATTR), String(value)).toBe(false);
    }
  });

  it("agrees with lib/shipping's zone for every shippable country", () => {
    for (const code of SHIPPABLE_COUNTRY_CODES) {
      clearCookies();
      root.removeAttribute(ZONE_ATTR);
      document.cookie = `${REGION_COOKIE}=${code}; Path=/`;
      run();
      const zone = root.getAttribute(ZONE_ATTR) ?? "domestic";
      expect(zone, code).toBe(zoneFor(code));
    }
  });

  it("never throws when cookies are unavailable", () => {
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get() {
        throw new Error("SecurityError");
      },
    });
    try {
      expect(run).not.toThrow();
    } finally {
      delete (document as { cookie?: unknown }).cookie;
      Object.defineProperty(Document.prototype, "cookie", desc);
    }
  });
});
