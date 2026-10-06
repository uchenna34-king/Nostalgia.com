import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// OWNER_EMAIL is read once at import, and a real one may sit in .env (Prisma
// loads it), so pin a known value and import fresh.
let isOwnerEmail: (email?: string | null) => boolean;

beforeAll(async () => {
  vi.stubEnv("OWNER_EMAIL", "owner@nostalgia.test");
  vi.resetModules();
  ({ isOwnerEmail } = await import("@/lib/owner"));
});
afterAll(() => {
  vi.unstubAllEnvs();
});

describe("isOwnerEmail", () => {
  it("matches the configured owner email", () => {
    expect(isOwnerEmail("owner@nostalgia.test")).toBe(true);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(isOwnerEmail("  OWNER@Nostalgia.TEST  ")).toBe(true);
  });

  it("rejects a non-owner email", () => {
    expect(isOwnerEmail("friend@nostalgia.test")).toBe(false);
  });

  it("rejects empty / null / undefined", () => {
    expect(isOwnerEmail("")).toBe(false);
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
  });

  it("is re-exported by lib/admin", async () => {
    const admin = await import("@/lib/admin");
    expect(admin.isOwnerEmail).toBe(isOwnerEmail);
  });
});
