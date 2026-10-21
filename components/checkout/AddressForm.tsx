"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ADDRESS_LIMITS,
  NIGERIA_STATES,
  addressErrorMessage,
  validateAddress,
  type AddressErrors,
  type AddressField,
  type ShippingAddress,
} from "@/lib/address";
import { countryOptions } from "@/lib/countries";
import { regionFromCountry } from "@/lib/region";

type Values = Record<AddressField, string>;

const EMPTY: Values = {
  fullName: "",
  phone: "",
  country: "NG",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
};

// DOM order, for "focus the first invalid field".
const ORDER: AddressField[] = ["fullName", "phone", "country", "line1", "line2", "city", "region", "postalCode"];

const LABEL = "mb-1 block text-xs uppercase tracking-[0.15em] text-ink-soft";
const CONTROL =
  "w-full border border-ink/25 bg-cream px-3 py-3 text-sm text-ink focus:border-ink aria-[invalid=true]:border-[#9B2C2C] dark:aria-[invalid=true]:border-ink disabled:opacity-60";

/**
 * Delivery address form (D-15, UI-SPEC Surface 3). Validation runs through
 * the same validateAddress the server uses, so rules and messages can't
 * drift; the server stays the authority. No prefill besides the country,
 * which starts at the shopper's ship-to region (D-33) and is theirs to change.
 */
export default function AddressForm({
  initialCountry,
  onValidSubmit,
  onCountryChange,
  serverErrors,
  disabled,
}: {
  /** Read once, at mount; anything we don't ship to starts at Nigeria. */
  initialCountry?: string;
  onValidSubmit: (address: ShippingAddress) => void;
  onCountryChange?: (country: string) => void;
  serverErrors?: AddressErrors | null;
  disabled: boolean;
}) {
  const [values, setValues] = useState<Values>(() => ({
    ...EMPTY,
    country: regionFromCountry(initialCountry),
  }));
  const [errors, setErrors] = useState<AddressErrors>({});
  const refs = useRef<Partial<Record<AddressField, HTMLInputElement | HTMLSelectElement | null>>>({});
  const countries = useMemo(() => countryOptions(), []);
  const isNigeria = values.country === "NG";

  const focusFirst = (errs: AddressErrors) => {
    const first = ORDER.find((f) => errs[f]);
    if (first) refs.current[first]?.focus();
  };

  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length > 0) {
      setErrors(serverErrors);
      focusFirst(serverErrors);
    }
  }, [serverErrors]);

  const fieldError = (next: Values, field: AddressField) => {
    const r = validateAddress(next);
    return r.ok ? undefined : r.errors[field];
  };

  const update = (field: AddressField, value: string) => {
    let next = { ...values, [field]: value };
    if (field === "country") {
      // The state control swaps between a select and free text: clear it.
      next = { ...next, region: "" };
      setErrors((e) => ({ ...e, region: undefined, country: undefined }));
      onCountryChange?.(value);
    }
    setValues(next);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: fieldError(next, field) }));
  };

  const blur = (field: AddressField) => {
    setErrors((e) => ({ ...e, [field]: fieldError(values, field) }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = validateAddress(values);
    if (!r.ok) {
      setErrors(r.errors);
      focusFirst(r.errors);
      return;
    }
    setErrors({});
    onValidSubmit(r.address);
  };

  const describedBy = (f: AddressField) =>
    errors[f] ? `${f}-error` : f === "phone" ? "phone-hint" : undefined;

  const common = (f: AddressField) => ({
    id: f,
    name: f,
    value: values[f],
    "aria-invalid": errors[f] ? true : undefined,
    "aria-describedby": describedBy(f),
    onBlur: () => blur(f),
    className: CONTROL,
  });

  const slot = (f: AddressField) =>
    errors[f] ? (
      <p id={`${f}-error`} className="mt-1 text-xs text-[#9B2C2C] dark:text-ink">
        {addressErrorMessage(f, errors[f]!, values.country)}
      </p>
    ) : f === "phone" ? (
      <p id="phone-hint" className="mt-1 text-xs text-ink-soft">
        So the courier can reach you.
      </p>
    ) : null;

  const optional = <span className="normal-case tracking-normal"> (optional)</span>;

  const text = (
    f: AddressField,
    label: ReactNode,
    autoComplete: string,
    opts: { full?: boolean; type?: string; required?: boolean } = {},
  ) => (
    <div className={opts.full ? "sm:col-span-2" : undefined}>
      <label htmlFor={f} className={LABEL}>
        {label}
      </label>
      <input
        {...common(f)}
        ref={(el) => {
          refs.current[f] = el;
        }}
        type={opts.type ?? "text"}
        inputMode={opts.type === "tel" ? "tel" : undefined}
        autoComplete={autoComplete}
        maxLength={ADDRESS_LIMITS[f].max}
        required={opts.required !== false}
        onChange={(e) => update(f, e.target.value)}
      />
      {slot(f)}
    </div>
  );

  return (
    <form id="checkout-form" noValidate onSubmit={submit} className="mt-6">
      <fieldset disabled={disabled} className="min-w-0 border-0 p-0">
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          {text("fullName", "Full name", "name", { full: true })}
          {text("phone", "Phone", "tel", { full: true, type: "tel" })}

          <div className="sm:col-span-2">
            <label htmlFor="country" className={LABEL}>
              Country
            </label>
            <select
              {...common("country")}
              ref={(el) => {
                refs.current.country = el;
              }}
              autoComplete="country"
              required
              onChange={(e) => update("country", e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {slot("country")}
          </div>

          {text("line1", "Address line 1", "address-line1", { full: true })}
          {text("line2", <>Address line 2{optional}</>, "address-line2", { full: true, required: false })}
          {text("city", "City", "address-level2")}

          {isNigeria ? (
            <div>
              <label htmlFor="region" className={LABEL}>
                State
              </label>
              <select
                {...common("region")}
                ref={(el) => {
                  refs.current.region = el;
                }}
                autoComplete="address-level1"
                required
                onChange={(e) => update("region", e.target.value)}
              >
                <option value="" disabled>
                  Select a state
                </option>
                {NIGERIA_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {slot("region")}
            </div>
          ) : (
            text("region", "State / region", "address-level1")
          )}

          {text("postalCode", <>Postal code{optional}</>, "postal-code", { required: false })}
        </div>
      </fieldset>
    </form>
  );
}
