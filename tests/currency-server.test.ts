// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
const headerGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () => ({ get: (...a: unknown[]) => cookieGet(...a) }),
  headers: () => ({ get: (...a: unknown[]) => headerGet(...a) }),
}));

import { getCurrency } from "@/lib/currency-server";

beforeEach(() => {
  cookieGet.mockReset();
  headerGet.mockReset();
});

describe("getCurrency", () => {
  it("prefers a valid cookie", () => {
    cookieGet.mockReturnValue({ value: "USD" });
    headerGet.mockReturnValue("NG");
    expect(getCurrency()).toBe("USD");
  });

  it("falls back to the country header, then NGN", () => {
    cookieGet.mockReturnValue({ value: "EUR" });
    headerGet.mockReturnValue("GB");
    expect(getCurrency()).toBe("USD");
    cookieGet.mockReturnValue(undefined);
    headerGet.mockReturnValue(null);
    expect(getCurrency()).toBe("NGN");
  });
});
