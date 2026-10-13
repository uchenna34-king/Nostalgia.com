// Ship-to countries (D-15). The ISO 3166-1 alpha-2 list is static and is the
// validation truth: it must NOT be derived from Intl, which also knows ~31
// non-ISO codes (ZZ, UN, EU, XK, legacy UK…). Intl.DisplayNames is used only
// to label options.

export const ISO_COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO " +
  "FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE " +
  "JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO " +
  "MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW " +
  "PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM " +
  "TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

/**
 * Countries couriers can't deliver to. PLACEHOLDER pending the owner's
 * confirmation (12-OWNER-SETUP.md).
 */
export const UNSHIPPABLE_COUNTRIES = ["KP", "IR", "SY", "CU"];

const UNSHIPPABLE = new Set(UNSHIPPABLE_COUNTRIES);
export const SHIPPABLE_COUNTRY_CODES = ISO_COUNTRY_CODES.filter(
  (c) => !UNSHIPPABLE.has(c),
);
const SHIPPABLE = new Set(SHIPPABLE_COUNTRY_CODES);

export function isShippableCountry(code: unknown): code is string {
  return typeof code === "string" && SHIPPABLE.has(code);
}

let displayNames: Intl.DisplayNames | null | undefined;

/** English country name for a code, or the code itself if Intl can't name it. */
export function countryName(code: string): string {
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      displayNames = null;
    }
  }
  try {
    return displayNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Select options: Nigeria first, then every other shippable country by name. */
export function countryOptions(): { code: string; name: string }[] {
  const rest = SHIPPABLE_COUNTRY_CODES.filter((c) => c !== "NG")
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  return [{ code: "NG", name: countryName("NG") }, ...rest];
}
