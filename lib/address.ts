// Delivery address rules (D-15). Pure and Prisma-free: the checkout form uses
// them for instant feedback and POST /api/checkout uses the same function as
// the authority, so the two can never disagree. The address is PII — never
// put it in analytics or logs.
import { countryName, isShippableCountry } from "@/lib/countries";

export type ShippingAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  /** Nigerian state (exact NIGERIA_STATES value) or free-text region. */
  region: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2, uppercase. */
  country: string;
};

export type AddressField = keyof ShippingAddress;
export type AddressErrorCode = "required" | "invalid" | "too_long";
export type AddressErrors = Partial<Record<AddressField, AddressErrorCode>>;

export const ADDRESS_LIMITS: Record<AddressField, { min: number; max: number }> = {
  fullName: { min: 2, max: 100 },
  phone: { min: 7, max: 24 },
  line1: { min: 3, max: 200 },
  line2: { min: 0, max: 200 },
  city: { min: 2, max: 100 },
  region: { min: 2, max: 100 },
  postalCode: { min: 0, max: 20 },
  country: { min: 2, max: 2 },
};

/** Nigeria's 36 states + FCT (ISO 3166-2:NG spellings). Stored verbatim. */
export const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "Federal Capital Territory", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun",
  "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara",
] as const;
const STATE_SET = new Set<string>(NIGERIA_STATES);

const PHONE_CHARS = /^\+?[0-9 ()./-]{7,24}$/;

/** Lenient: + digits spaces ( ) . / - with 7–15 digits (E.164 max). */
export function isPlausiblePhone(s: string): boolean {
  if (!PHONE_CHARS.test(s)) return false;
  const digits = s.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

const POSTAL = /^[A-Za-z0-9 -]*$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/** The one set of field error strings, for client and server (UI-SPEC). */
export function addressErrorMessage(
  field: AddressField,
  code: AddressErrorCode,
  country?: string,
): string {
  if (code === "too_long") {
    return `That's too long. Use ${ADDRESS_LIMITS[field].max} characters or fewer.`;
  }
  switch (field) {
    case "fullName":
      return "Enter your full name.";
    case "phone":
      return code === "required"
        ? "Enter a phone number so the courier can reach you."
        : "Use digits, spaces, + or dashes, for example +234 803 123 4567.";
    case "country":
      return "Choose a country.";
    case "line1":
      return "Enter your street address.";
    case "city":
      return "Enter your city.";
    case "region":
      return country === "NG" ? "Choose a state." : "Enter your state or region.";
    case "postalCode":
      return "Use letters, numbers, spaces or dashes only.";
    default:
      return "Check this field.";
  }
}

type Result =
  | { ok: true; address: ShippingAddress }
  | { ok: false; errors: AddressErrors };

/**
 * Validates untrusted input and returns ONLY the normalised object (trimmed
 * strings, known keys) — never the raw input — so nothing unexpected is ever
 * persisted to Order.shippingAddress.
 */
export function validateAddress(raw: unknown): Result {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const errors: AddressErrors = {};
  const out: Partial<ShippingAddress> = {};

  const text = (field: AddressField, required: boolean): string | undefined => {
    const v = src[field];
    const s = typeof v === "string" ? v.trim() : "";
    const { min, max } = ADDRESS_LIMITS[field];
    if (!s) {
      if (required) errors[field] = "required";
      return undefined;
    }
    if (CONTROL_CHARS.test(s)) {
      errors[field] = "invalid";
      return undefined;
    }
    if (s.length > max) {
      errors[field] = "too_long";
      return undefined;
    }
    if (s.length < min) {
      errors[field] = required ? "required" : "invalid";
      return undefined;
    }
    return s;
  };

  out.fullName = text("fullName", true);
  out.line1 = text("line1", true);
  out.line2 = text("line2", false);
  out.city = text("city", true);

  const phone = text("phone", true);
  if (phone !== undefined) {
    if (isPlausiblePhone(phone)) out.phone = phone;
    else errors.phone = "invalid";
  }

  const country = text("country", true);
  if (country !== undefined) {
    if (isShippableCountry(country)) out.country = country;
    else errors.country = "invalid";
  }

  const region = text("region", true);
  if (region !== undefined) {
    if (out.country === "NG" && !STATE_SET.has(region)) errors.region = "invalid";
    else out.region = region;
  }

  const postal = text("postalCode", false);
  if (postal !== undefined) {
    if (POSTAL.test(postal)) out.postalCode = postal;
    else errors.postalCode = "invalid";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const address: ShippingAddress = {
    fullName: out.fullName!,
    phone: out.phone!,
    line1: out.line1!,
    city: out.city!,
    region: out.region!,
    country: out.country!,
  };
  if (out.line2) address.line2 = out.line2;
  if (out.postalCode) address.postalCode = out.postalCode;
  return { ok: true, address };
}

/** Display lines shared by admin, account and the email (plain text only). */
export function addressLines(a: ShippingAddress): string[] {
  const cityLine = [a.city, [a.region, a.postalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [a.fullName, a.line1, a.line2, cityLine, countryName(a.country), a.phone].filter(
    (l): l is string => Boolean(l),
  );
}
