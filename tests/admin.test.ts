import { describe, expect, it } from "vitest";
import { isOwnerEmail } from "@/lib/admin";

describe("isOwnerEmail", () => {
  it("matches the placeholder owner email", () => {
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
});
