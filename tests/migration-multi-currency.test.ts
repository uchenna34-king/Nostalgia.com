// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_MINOR } from "@/lib/currency";

const root = process.cwd();
const sql = readFileSync(
  join(root, "prisma", "migrations", "20261013120000_multi_currency", "migration.sql"),
  "utf8",
);
const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");

describe("multi-currency migration", () => {
  it("adds priceNgn nullable, backfills, then tightens it", () => {
    const add = sql.indexOf('ADD COLUMN     "priceNgn" INTEGER,');
    const backfill = sql.indexOf('UPDATE "Product"');
    const tighten = sql.indexOf('ALTER COLUMN "priceNgn" SET NOT NULL');
    expect(add).toBeGreaterThan(-1);
    expect(backfill).toBeGreaterThan(add);
    expect(tighten).toBeGreaterThan(backfill);
    expect(sql).toContain('SET "priceUsdOverride" = "price"');
    expect(sql).toContain('ROUND("price"::numeric * 1500 / 50000) * 50000');
  });

  it("cannot overflow the INTEGER column, whatever price a product has", () => {
    // Rehearsal finding: any product over $14,316.55 made price x 1500 overflow
    // INTEGER, which rolls the migration back but records it as failed, and
    // that blocks every later deploy until it is resolved by hand.
    const cap = Math.floor(MAX_MINOR / 50000) * 50000;
    expect(sql).toContain(
      `GREATEST(LEAST(ROUND("price"::numeric * 1500 / 50000) * 50000, ${cap}), 0)::integer`,
    );
    // The capped naira price is still one the admin form accepts on save.
    expect(cap).toBeLessThanOrEqual(MAX_MINOR);
    expect(cap % 50000).toBe(0);
  });

  it("labels legacy orders USD and seeds the placeholder rate once", () => {
    expect(sql).toContain(`"currency" TEXT NOT NULL DEFAULT 'USD'`);
    expect(sql).toMatch(/VALUES \(1, 1500, CURRENT_TIMESTAMP\)\s+ON CONFLICT \("id"\) DO NOTHING/);
    expect(sql).toContain('CREATE INDEX "Product_priceNgn_idx"');
  });

  it("is expand-only", () => {
    const statements = sql.replace(/--.*$/gm, "");
    expect(statements).not.toMatch(/\bDROP\b/i);
    expect(statements).not.toMatch(/\bRENAME\b/i);
  });

  it("matches the schema", () => {
    expect(schema).toMatch(/priceUsd\s+Int\s+@map\("price"\)/);
    expect(schema).toMatch(/model StoreSettings \{/);
    expect(schema).toMatch(/currency\s+String\s+@default\("USD"\)/);
  });
});
