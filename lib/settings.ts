import { prisma } from "@/lib/db";
import { isValidRate } from "@/lib/currency";

/**
 * The store exchange rate (D-05): one StoreSettings row, id 1, holding whole
 * naira per $1. The migration seeds it, so a missing row means the database
 * update hasn't been applied.
 */
const SETTINGS_ID = 1;

export type RateSettings = {
  rate: number;
  updatedAt: Date;
  /** Products whose dollar price follows the rate (no hand-set override). */
  autoCount: number;
  /** Products with their own dollar price, which the rate never changes. */
  fixedCount: number;
};

export async function getUsdNgnRate(): Promise<number | null> {
  const row = await prisma.storeSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row?.usdNgnRate ?? null;
}

export async function getRateSettings(): Promise<RateSettings | null> {
  const [row, autoCount, fixedCount] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { id: SETTINGS_ID } }),
    prisma.product.count({ where: { priceUsdOverride: null } }),
    prisma.product.count({ where: { NOT: { priceUsdOverride: null } } }),
  ]);
  if (!row) return null;
  return { rate: row.usdNgnRate, updatedAt: row.updatedAt, autoCount, fixedCount };
}

/**
 * Save a new rate and re-price every product without a hand-set dollar price,
 * together (D-06). The UPDATE is the SQL twin of autoUsdMinor: kobo ÷ (rate ×
 * 100), rounded UP to a whole dollar, in cents. It writes "price" because that
 * is the column behind Product.priceUsd (@map). The rate is validated, then
 * bound as a parameter by the tagged template, never built into the SQL text.
 * Returns how many products were re-priced.
 */
export async function setUsdNgnRate(rate: number): Promise<number> {
  if (!isValidRate(rate)) throw new Error("invalid_rate");
  const [, updated] = await prisma.$transaction([
    prisma.storeSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { usdNgnRate: rate },
      create: { id: SETTINGS_ID, usdNgnRate: rate },
    }),
    prisma.$executeRaw`
      UPDATE "Product"
      SET "price" = (CEIL("priceNgn"::numeric / (${rate}::numeric * 100)) * 100)::int
      WHERE "priceUsdOverride" IS NULL`,
  ]);
  return updated;
}
