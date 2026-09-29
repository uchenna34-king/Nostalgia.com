"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { registerAccount } from "@/app/register/actions";
import {
  PASSWORD_MIN,
  PASSWORD_MAX,
  NAME_MAX,
  type RegistrationErrors,
} from "@/lib/registration-rules";

const inputClass =
  "w-full border border-ink/20 bg-cream px-3 py-2.5 text-sm aria-[invalid=true]:border-sepia";
const labelClass =
  "mb-1 block text-xs uppercase tracking-[0.15em] text-ink-soft";

export default function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; devLink?: string } | null>(
    null,
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setMessage(null);
    const result = await registerAccount(new FormData(e.currentTarget));
    setStatus("idle");
    if (result.ok) {
      setSent({ email: result.email, devLink: result.devLink });
    } else {
      setErrors(result.errors);
      setMessage(result.message ?? null);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm" role="status">
        <h2 className="font-serif text-3xl font-normal">Check your inbox</h2>
        <p className="mt-3 text-sm text-ink-soft">
          We sent a verification link to{" "}
          <span className="text-ink">{sent.email}</span>. Click it to finish
          creating your account. It expires in 24 hours.
        </p>
        {sent.devLink && (
          <p className="mt-5 border border-ink/15 p-3 text-left text-xs text-ink-soft">
            Development only, no email service configured:{" "}
            <a href={sent.devLink} className="break-all text-ink underline">
              open the verification link
            </a>
          </p>
        )}
        <button
          type="button"
          onClick={() => setSent(null)}
          className="mt-6 text-xs uppercase tracking-[0.18em] text-ink-soft underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  const describedBy = (field: keyof RegistrationErrors) =>
    errors[field] ? `${field}-error` : undefined;

  const fieldError = (field: keyof RegistrationErrors) =>
    errors[field] ? (
      <p id={`${field}-error`} className="mt-1 text-xs text-sepia">
        {errors[field]}
      </p>
    ) : null;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-sm space-y-4 text-left"
    >
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div>
        <label htmlFor="name" className={labelClass}>
          Full name
        </label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          required
          maxLength={NAME_MAX}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name")}
          className={inputClass}
        />
        {fieldError("name")}
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("email")}
          className={inputClass}
        />
        {fieldError("email")}
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : "password-hint"}
          className={inputClass}
        />
        {errors.password ? (
          fieldError("password")
        ) : (
          <p id="password-hint" className="mt-1 text-xs text-ink-soft">
            At least {PASSWORD_MIN} characters.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="confirm" className={labelClass}>
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.confirm)}
          aria-describedby={describedBy("confirm")}
          className={inputClass}
        />
        {fieldError("confirm")}
      </div>

      {message && (
        <p role="alert" className="text-sm text-sepia">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn-primary w-full disabled:opacity-60"
      >
        {status === "submitting" ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link
          href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-ink underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
