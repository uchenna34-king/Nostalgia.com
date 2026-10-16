// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const requireOwner = vi.fn();
const setUsdNgnRate = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/admin", () => ({
  requireOwner: (...a: unknown[]) => {
    calls.push("requireOwner");
    return requireOwner(...a);
  },
}));
vi.mock("@/lib/settings", () => ({
  setUsdNgnRate: (...a: unknown[]) => {
    calls.push("setUsdNgnRate");
    return setUsdNgnRate(...a);
  },
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => revalidatePath(...a),
}));

import { saveExchangeRate } from "@/app/admin/settings/actions";

beforeEach(() => {
  calls.length = 0;
  requireOwner.mockReset();
  requireOwner.mockResolvedValue(undefined);
  setUsdNgnRate.mockReset();
  revalidatePath.mockReset();
});

describe("saveExchangeRate (D-05, D-06)", () => {
  it("checks the owner before anything else", async () => {
    setUsdNgnRate.mockResolvedValue(3);
    await saveExchangeRate("1600");
    expect(calls).toEqual(["requireOwner", "setUsdNgnRate"]);
  });

  it("stops completely when the visitor isn't the owner", async () => {
    requireOwner.mockRejectedValue(new Error("NEXT_NOT_FOUND"));
    await expect(saveExchangeRate("1600")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(setUsdNgnRate).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(["", "abc", "99", "100001", "1500.5", "1,500", "1e3", "-1500", " "])(
    "rejects %j without touching the database",
    async (raw) => {
      expect(await saveExchangeRate(raw)).toEqual({ ok: false, error: "invalid_rate" });
      expect(setUsdNgnRate).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("saves a whole-naira rate and reports how many prices it re-priced", async () => {
    setUsdNgnRate.mockResolvedValue(7);
    expect(await saveExchangeRate(" 1600 ")).toEqual({ ok: true, updated: 7 });
    expect(setUsdNgnRate).toHaveBeenCalledWith(1600);
  });

  it("refreshes the admin and every storefront page that shows a price", async () => {
    setUsdNgnRate.mockResolvedValue(0);
    await saveExchangeRate("1600");
    expect(revalidatePath.mock.calls).toEqual([
      ["/admin/products"],
      ["/admin/settings"],
      ["/"],
      ["/shop/[[...slug]]", "page"],
      ["/product/[slug]", "page"],
      ["/collections"],
      ["/collections/[slug]", "page"],
    ]);
  });

  it("reports a failed save without revalidating", async () => {
    setUsdNgnRate.mockRejectedValue(new Error("connection reset"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await saveExchangeRate("1600")).toEqual({ ok: false, error: "save_failed" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("/admin/settings page", () => {
  it("explains that the database update is missing when there is no rate row", async () => {
    vi.resetModules();
    vi.doMock("@/lib/settings", () => ({ getRateSettings: async () => null, setUsdNgnRate }));
    const { default: Page } = await import("@/app/admin/settings/page");
    const html = JSON.stringify(await Page());
    expect(html).toContain("The latest database update");
    expect(html).not.toContain("RateForm");
    vi.doUnmock("@/lib/settings");
  });
});
