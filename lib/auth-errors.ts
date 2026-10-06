// Maps NextAuth's ?error= code on /signin to customer-facing copy. The code
// arrives in the URL, so it is attacker-controlled: only these fixed strings
// are ever rendered, never the raw value.

const GENERIC = "Google sign-in didn't complete. Please try again.";

const MESSAGES: Record<string, string> = {
  // Shouldn't happen while Google may link by email (lib/auth.ts), but if an
  // account for this email exists under another sign-in it lands here.
  OAuthAccountNotLinked:
    "This email is already linked to another account. Contact us and we'll sort it out.",
  // Our signIn callback refused: Google didn't vouch for the email.
  AccessDenied:
    "We couldn't confirm that Google email address. Try another Google account.",
};

export function signInErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  // Own-property check, so "constructor" or "__proto__" fall to the generic.
  return Object.prototype.hasOwnProperty.call(MESSAGES, code)
    ? MESSAGES[code]
    : GENERIC;
}
