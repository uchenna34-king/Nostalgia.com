// Intentionally import-free: this module derives the auth provider gates as
// pure booleans so the security-critical ALLOW_DEMO_LOGIN decision is
// unit-testable without booting Prisma or NextAuth. See D-03.

/**
 * Derive the two provider-registration flags from a plain env-shaped record.
 *
 * `hasGoogle` mirrors the existing Google-credentials-present check.
 *
 * `allowDemoLogin` is decided by strict string equality against the exact
 * lowercase four-character string "true" — never a truthiness coercion. A
 * coercion would treat any non-empty string as "on", and the value an
 * operator is most likely to type when they mean "off" is itself a
 * non-empty, and therefore truthy, string. The value is read as-is: no
 * trimming, no case-folding, no other normalization. An operator who types a
 * value this gate does not recognize gets the closed position, not a guess.
 */
export function buildProviderFlags(env: Record<string, string | undefined>): {
  hasGoogle: boolean;
  allowDemoLogin: boolean;
} {
  return {
    hasGoogle: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    allowDemoLogin: env.ALLOW_DEMO_LOGIN === "true",
  };
}
