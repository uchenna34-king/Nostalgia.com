// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ISO_COUNTRY_CODES,
  SHIPPABLE_COUNTRY_CODES,
  UNSHIPPABLE_COUNTRIES,
  countryName,
  countryOptions,
  isShippableCountry,
} from "@/lib/countries";
import {
  NIGERIA_STATES,
  addressErrorMessage,
  addressLines,
  isPlausiblePhone,
  validateAddress,
} from "@/lib/address";

const VALID_NG = {
  fullName: "Ada Obi",
  phone: "+234 803 123 4567",
  line1: "12 Admiralty Way",
  city: "Lekki",
  region: "Lagos",
  country: "NG",
};

describe("countries", () => {
  it("is the 249-code ISO list minus the unshippable ones", () => {
    expect(ISO_COUNTRY_CODES).toHaveLength(249);
    expect(new Set(ISO_COUNTRY_CODES).size).toBe(249);
    expect(SHIPPABLE_COUNTRY_CODES).toHaveLength(249 - UNSHIPPABLE_COUNTRIES.length);
  });

  it("accepts real shippable codes and rejects non-ISO, lowercase and blocked ones", () => {
    expect(isShippableCountry("NG")).toBe(true);
    expect(isShippableCountry("GB")).toBe(true);
    for (const bad of ["UK", "ZZ", "EU", "XK", "ng", "KP", "", null]) {
      expect(isShippableCountry(bad)).toBe(false);
    }
  });

  it("names countries and puts Nigeria first", () => {
    expect(countryName("NG")).toBe("Nigeria");
    expect(countryName("GB")).toBe("United Kingdom");
    const opts = countryOptions();
    expect(opts[0]).toEqual({ code: "NG", name: "Nigeria" });
    expect(opts).toHaveLength(SHIPPABLE_COUNTRY_CODES.length);
  });
});

describe("Nigerian states", () => {
  it("has 36 states plus the FCT with standard spellings", () => {
    expect(NIGERIA_STATES).toHaveLength(37);
    expect(NIGERIA_STATES).toContain("Federal Capital Territory");
    expect(NIGERIA_STATES).toContain("Nasarawa");
    expect(NIGERIA_STATES).toContain("Akwa Ibom");
  });
});

describe("isPlausiblePhone", () => {
  it("accepts common Nigerian and international formats", () => {
    for (const ok of ["08031234567", "+234 803 123 4567", "+44 20 7946 0958", "(212) 555-0100"]) {
      expect(isPlausiblePhone(ok)).toBe(true);
    }
  });
  it("rejects letters and too few or too many digits", () => {
    for (const bad of ["0803-CALL-ME", "12345", "+1234567890123456", "++2348031234567"]) {
      expect(isPlausiblePhone(bad)).toBe(false);
    }
  });
});

describe("validateAddress", () => {
  it("accepts a valid Nigerian address and returns only the normalised fields", () => {
    const r = validateAddress({ ...VALID_NG, fullName: "  Ada Obi  ", extra: "<script>" });
    expect(r).toEqual({ ok: true, address: { ...VALID_NG, fullName: "Ada Obi" } });
  });

  it("keeps optional fields only when present", () => {
    const r = validateAddress({ ...VALID_NG, line2: "Flat 3", postalCode: "106104" });
    expect(r.ok && r.address.line2).toBe("Flat 3");
    expect(r.ok && r.address.postalCode).toBe("106104");
  });

  it("requires every mandatory field", () => {
    const r = validateAddress({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toEqual({
        fullName: "required",
        line1: "required",
        city: "required",
        phone: "required",
        country: "required",
        region: "required",
      });
    }
  });

  it("requires an exact state name for Nigeria but free text elsewhere", () => {
    const ng = validateAddress({ ...VALID_NG, region: "lagos" });
    expect(!ng.ok && ng.errors.region).toBe("invalid");
    const gb = validateAddress({ ...VALID_NG, country: "GB", region: "Greater London" });
    expect(gb.ok).toBe(true);
  });

  it("rejects unshippable countries, bad phones, bad postcodes, control chars and long values", () => {
    const cases: [Record<string, string>, string, string][] = [
      [{ country: "KP" }, "country", "invalid"],
      [{ country: "ng" }, "country", "invalid"],
      [{ phone: "call me" }, "phone", "invalid"],
      [{ postalCode: "10$1" }, "postalCode", "invalid"],
      [{ line1: "12 Admiralty\u0000Way" }, "line1", "invalid"],
      [{ city: "x".repeat(101) }, "city", "too_long"],
    ];
    for (const [over, field, code] of cases) {
      const r = validateAddress({ ...VALID_NG, ...over });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors[field as keyof typeof r.errors]).toBe(code);
    }
  });

  it("treats non-object input as empty", () => {
    expect(validateAddress(null).ok).toBe(false);
    expect(validateAddress("x").ok).toBe(false);
  });
});

describe("addressErrorMessage", () => {
  it("uses the UI-SPEC strings", () => {
    expect(addressErrorMessage("phone", "required")).toBe("Enter a phone number so the courier can reach you.");
    expect(addressErrorMessage("region", "required", "NG")).toBe("Choose a state.");
    expect(addressErrorMessage("region", "required", "GB")).toBe("Enter your state or region.");
    expect(addressErrorMessage("city", "too_long")).toBe("That's too long. Use 100 characters or fewer.");
  });
});

describe("addressLines", () => {
  it("formats name, street, city/region/postal, country name and phone", () => {
    expect(
      addressLines({ ...VALID_NG, line2: "Flat 3", postalCode: "106104" }),
    ).toEqual(["Ada Obi", "12 Admiralty Way", "Flat 3", "Lekki, Lagos 106104", "Nigeria", "+234 803 123 4567"]);
    expect(addressLines(VALID_NG)).toEqual([
      "Ada Obi",
      "12 Admiralty Way",
      "Lekki, Lagos",
      "Nigeria",
      "+234 803 123 4567",
    ]);
  });
});
