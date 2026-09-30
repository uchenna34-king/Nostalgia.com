// Pure sign-up rules, shared by the register form (client) and
// lib/registration.ts (server). No Prisma or Node imports, so it is safe to
// bundle for the browser.

export const NAME_MAX = 80;
export const PASSWORD_MIN = 8;
// scrypt cost grows with input length; cap it so a huge "password" can't be
// used to burn server CPU.
export const PASSWORD_MAX = 128;

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  confirm: string;
};

export type RegistrationField = keyof RegistrationInput;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

export const EMAIL_TAKEN =
  "An account with this email already exists. Sign in instead.";

export const EMAIL_USES_GOOGLE =
  "This email signs in with Google. Use Continue with Google instead.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateRegistration(
  input: RegistrationInput,
): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const name = input.name.trim();
  const email = normalizeEmail(input.email);

  if (name.length < 2) errors.name = "Enter your full name.";
  else if (name.length > NAME_MAX)
    errors.name = `Keep your name under ${NAME_MAX} characters.`;

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter a valid email address.";

  if (input.password.length < PASSWORD_MIN)
    errors.password = `Use at least ${PASSWORD_MIN} characters.`;
  else if (input.password.length > PASSWORD_MAX)
    errors.password = `Use at most ${PASSWORD_MAX} characters.`;

  if (!errors.password && input.confirm !== input.password)
    errors.confirm = "Passwords don't match.";

  return errors;
}

/** Only same-site paths survive, so a crafted link can't bounce users off-site. */
export function safeCallbackUrl(value: unknown): string {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
    ? value
    : "/";
}
