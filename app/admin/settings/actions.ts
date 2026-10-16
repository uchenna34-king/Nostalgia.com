"use server";

import { requireOwner } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { isValidRate } from "@/lib/currency";
import { setUsdNgnRate } from "@/lib/settings";

export type RateActionResult =
  | { ok: true; updated: number }
  | { ok: false; error: "invalid_rate" | "save_failed" };

/**
 * Save the store exchange rate (D-05, D-06): whole naira per $1, 100 to
 * 100,000. Saving re-prices every product without a hand-set dollar price in
 * the same transaction (lib/settings.ts), then refreshes every page that
 * shows a price. Returns how many dollar prices changed.
 */
export async function saveExchangeRate(raw: string): Promise<RateActionResult> {
  await requireOwner();

  // Digits only: no commas, decimals, signs or exponents.
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  const rate = /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
  if (!isValidRate(rate)) return { ok: false, error: "invalid_rate" };

  let updated: number;
  try {
    updated = await setUsdNgnRate(rate);
  } catch (e) {
    const err = e as Error;
    console.error("exchange rate save failed", { name: err?.name, message: err?.message });
    return { ok: false, error: "save_failed" };
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/shop/[[...slug]]", "page");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/collections");
  revalidatePath("/collections/[slug]", "page");
  return { ok: true, updated };
}
