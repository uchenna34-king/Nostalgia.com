// Maps NextAuth's ?error= code on /signin to customer-facing copy. The code
// arrives in the URL, so it is attacker-controlled: only these fixed strings
// are ever rendered, never the raw value.

const GENERIC = "Google sign-in didn't complete. Please try again.";

const MESSAGES: Record<string, string> = {
  // A /register (password) account exists for this email but Google isn't
  // linked to it yet.
  OAuthAccountNotLinked:
    "This email is already registered. Sign in with your password below, and you can use Google next time.",
  // Our signIn callback refused: Google didn't vouch for the email.
  AccessDenied:
    "We couldn't confirm that Google email address. Try another account or sign in with email.",
  // The password form signs in without a redirect, so this only appears if a
  // credentials sign-in ever falls back to NextAuth's redirect flow.
  CredentialsSignin: "That email and password don't match an account.",
};

export function signInErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  // Own-property check, so "constructor" or "__proto__" fall to the generic.
  return Object.prototype.hasOwnProperty.call(MESSAGES, code)
    ? MESSAGES[code]
    : GENERIC;
}
