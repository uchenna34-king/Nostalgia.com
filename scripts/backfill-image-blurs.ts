/**
 * One-off: give existing product photos a blur placeholder.
 *
 * Photos uploaded through /admin get one automatically; this covers images
 * added before that (seeded /products/* files and pasted URLs).
 *
 *   npx tsx scripts/backfill-image-blurs.ts            # dry run
 *   npx tsx scripts/backfill-image-blurs.ts --write    # update the database
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { makeBlurDataUrl } from "../lib/product-images";

const prisma = new PrismaClient();
const write = process.argv.includes("--write");

async function load(url: string): Promise<Buffer> {
  if (url.startsWith("/")) {
    return readFile(path.join(process.cwd(), "public", decodeURIComponent(url)));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const rows = await prisma.productImage.findMany({
    where: { blurDataUrl: null },
    select: { id: true, url: true },
  });
  console.log(`${rows.length} image(s) without a blur placeholder${write ? "" : " (dry run)"}`);

  // Products often share a file; only process each URL once.
  const blurByUrl = new Map<string, string | null>();
  let updated = 0;
  for (const row of rows) {
    if (!blurByUrl.has(row.url)) {
      try {
        blurByUrl.set(row.url, await makeBlurDataUrl(await load(row.url)));
      } catch (e) {
        console.warn(`  skip ${row.url}: ${(e as Error).message}`);
        blurByUrl.set(row.url, null);
      }
    }
    const blur = blurByUrl.get(row.url);
    if (!blur) continue;
    if (write) {
      await prisma.productImage.update({ where: { id: row.id }, data: { blurDataUrl: blur } });
    }
    updated++;
  }
  console.log(`${write ? "Updated" : "Would update"} ${updated} row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
