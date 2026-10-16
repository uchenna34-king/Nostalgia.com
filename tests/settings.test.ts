// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn();
const count = vi.fn();
const executeRaw = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    storeSettings: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      upsert: (...a: unknown[]) => {
        upsert(...a);
        return "UPSERT_OP";
      },
    },
    product: { count: (...a: unknown[]) => count(...a) },
    // A tagged template: record the literal SQL text and the bound values.
    $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
      executeRaw(strings.join("?"), values);
      return "RECOMPUTE_OP";
    },
    $transaction: (ops: unknown[]) => transaction(ops),
  },
}));

import { getRateSettings, getUsdNgnRate, setUsdNgnRate } from "@/lib/settings";

const UPDATED = new Date("2026-10-13T14:05:00Z");

beforeEach(() => {
  for (const f of [findUnique, upsert, count, executeRaw, transaction]) f.mockReset();
});

describe("getUsdNgnRate", () => {
  it("reads the singleton row", async () => {
    findUnique.mockResolvedValue({ id: 1, usdNgnRate: 1600, updatedAt: UPDATED });
    expect(await getUsdNgnRate()).toBe(1600);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("is null when the row is missing (migration not applied)", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getUsdNgnRate()).toBeNull();
  });
});

describe("getRateSettings", () => {
  it("returns the rate, when it changed, and how many prices follow it", async () => {
    findUnique.mockResolvedValue({ id: 1, usdNgnRate: 1500, updatedAt: UPDATED });
    count.mockImplementation(async (args: { where: unknown }) =>
      JSON.stringify(args.where) === JSON.stringify({ priceUsdOverride: null }) ? 12 : 3,
    );
    expect(await getRateSettings()).toEqual({
      rate: 1500,
      updatedAt: UPDATED,
      autoCount: 12,
      fixedCount: 3,
    });
    expect(count).toHaveBeenCalledWith({ where: { priceUsdOverride: null } });
    expect(count).toHaveBeenCalledWith({ where: { NOT: { priceUsdOverride: null } } });
  });

  it("is null when the row is missing", async () => {
    findUnique.mockResolvedValue(null);
    count.mockResolvedValue(0);
    expect(await getRateSettings()).toBeNull();
  });
});

describe("setUsdNgnRate", () => {
  it.each([99, 100_001, 1500.5, Number.NaN, -1500, "1500", null])(
    "rejects %s without touching the database",
    async (rate) => {
      await expect(setUsdNgnRate(rate as number)).rejects.toThrow("invalid_rate");
      expect(upsert).not.toHaveBeenCalled();
      expect(executeRaw).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it("saves the rate and re-prices every rate-following product in one transaction", async () => {
    transaction.mockResolvedValue([{ id: 1, usdNgnRate: 1600 }, 7]);

    expect(await setUsdNgnRate(1600)).toBe(7);

    expect(upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      update: { usdNgnRate: 1600 },
      create: { id: 1, usdNgnRate: 1600 },
    });
    expect(transaction).toHaveBeenCalledWith(["UPSERT_OP", "RECOMPUTE_OP"]);
  });

  it("recomputes with the same rounding as autoUsdMinor, binding only the rate", async () => {
    transaction.mockResolvedValue([{}, 0]);
    await setUsdNgnRate(1600);

    const [sql, values] = executeRaw.mock.calls[0] as [string, unknown[]];
    // "price" is the column behind Product.priceUsd (@map), invisible to Prisma here.
    expect(sql).toContain('UPDATE "Product"');
    expect(sql).toContain('SET "price" = (CEIL("priceNgn"::numeric / (?::numeric * 100)) * 100)::int');
    expect(sql).toContain('WHERE "priceUsdOverride" IS NULL');
    // The rate is a bound parameter, never concatenated into the SQL text.
    expect(values).toEqual([1600]);
    expect(sql).not.toContain("1600");
  });
});
