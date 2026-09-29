"use server";

import {
  sendVerificationEmail,
  verificationEmailEnabled,
} from "@/lib/verification-email";
import {
  safeCallbackUrl,
  startRegistration,
  type RegistrationErrors,
} from "@/lib/registration";

export type RegisterResult =
  | { ok: true; email: string; devLink?: string }
  | { ok: false; errors: RegistrationErrors; message?: string };

const field = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
};

export async function registerAccount(
  formData: FormData,
): Promise<RegisterResult> {
  const result = await startRegistration({
    name: field(formData, "name"),
    email: field(formData, "email"),
    password: field(formData, "password"),
    confirm: field(formData, "confirm"),
  });
  if (!result.ok) return result;

  const origin = process.env.NEXTAUTH_URL;
  if (!origin) {
    console.error("registerAccount: NEXTAUTH_URL is not set");
    return {
      ok: false,
      errors: {},
      message: "Sign-up is unavailable right now. Please try again later.",
    };
  }

  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  const link = `${origin}/register/verify?token=${result.token}&callbackUrl=${encodeURIComponent(callbackUrl)}`;

  if (await sendVerificationEmail(result.email, link)) {
    return { ok: true, email: result.email };
  }

  // Local development without Resend: hand the link straight to the page so
  // the flow can be tested end to end. Never in production — there, the link
  // is the proof of owning the address.
  if (!verificationEmailEnabled && process.env.NODE_ENV !== "production") {
    console.info("[register] verification link (dev only):", link);
    return { ok: true, email: result.email, devLink: link };
  }

  return {
    ok: false,
    errors: {},
    message:
      "We couldn't send the verification email just now. Please try again in a few minutes.",
  };
}
