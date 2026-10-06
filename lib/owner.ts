// Who the store owner is. Kept apart from lib/admin.ts (which imports
// lib/auth) so lib/auth can use it too without an import cycle.

/**
 * Single-owner identity (D-01). Read from OWNER_EMAIL, falling back to a
 * placeholder for local dev — the real owner Google address is set in .env at
 * Phase 11 go-live. Never hardcode a real email here.
 */
export const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "owner@nostalgia.test")
  .trim()
  .toLowerCase();

/** Case- and whitespace-insensitive check that `email` is the store owner. */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL;
}
