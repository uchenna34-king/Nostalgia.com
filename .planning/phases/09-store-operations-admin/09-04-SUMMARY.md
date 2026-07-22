---
phase: 09-store-operations-admin
plan: 04
status: complete
completed: 2026-07-21
requirements: [ADMN-02, ADMN-03]
---

# 09-04 Summary — Product & collection management

## What was built
**Products**
- `app/admin/products/actions.ts` — `createProduct` / `updateProduct` / `deleteProduct` Server Actions. Each `await requireOwner()` first; explicit field-by-field extraction (`parseProductInput`); integer price/stock validation; dual-write `variants` rows + `sizes` JSON; `revalidatePath` fan-out to `/shop`, `/`, `/product/[slug]`, `/collections/[slug]`, `/admin/products`; hard delete (safe — Order.items has no FK, D-07); `P2002` slug-collision → typed error.
- `app/admin/products/page.tsx` — fetches ALL products via `prisma.product.findMany` (bypasses `getCatalog` stock filter so sold-out items stay editable); `components/admin/ProductTable.tsx` (client) dense table with thumbnail/name/category/price/total-stock/featured + Edit/Delete (confirm) + Add product + empty state.
- `components/admin/ProductForm.tsx` (client, shared create/edit) with `SizeStockEditor` (per-size stock, min-0, fully-sold-out note), `ImageUrlEditor` (URL+alt rows, arrow reorder, no file input, D-05), `CollectionPicker` (checklist). Routes `new/page.tsx` + `[id]/edit/page.tsx` (server; edit pre-loads images+variants+collections, `notFound()` on miss).

**Collections (closes Phase 8 D-11)**
- `app/admin/collections/actions.ts` — `createCollection` / `updateCollection` / `deleteCollection`, same discipline (requireOwner-first, explicit extraction, revalidate, P2002).
- `app/admin/collections/page.tsx` + `components/admin/CollectionTable.tsx` (client) + `CollectionForm.tsx` (client, name/slug/description + product checklist) + `new`/`[id]/edit` routes.

## Verification
- `npx tsc --noEmit` → exit 0.
- Access control (source assertion): both actions files have `await requireOwner` count == `export async function` count == 3 (every action gated first). No raw/spread FormData into Prisma `data` (mass-assignment mitigation).
- In-browser (signed in as `owner@nostalgia.test`):
  - `/admin/products` lists all 10 seeded products incl. sold-out `Corduroy Cap` (bypasses stock filter).
  - Created "Test Cardigan" (size M / stock 5) via the form → redirected to list (11 rows) → appeared on `/shop` at `/product/test-cardigan` (revalidatePath, SC#2).
  - Edit page pre-populates name/slug/price/category/description + size M stock 5.
  - `/admin/collections` shows Autumn Archive (4) + Essentials (5) with Edit/Delete/Add.
  - Test artifact deleted afterward (catalog back to 10).

## Deviations
- **Editor row encoding:** the size/stock, image, and collection rows are submitted as JSON in hidden FormData fields (`variants`, `images`, `collectionIds`) rather than parallel FormData arrays — simpler, order-safe parsing. Actions `JSON.parse` defensively.
- **Actions return a typed result + client navigates** (`router.push`) on success rather than `redirect()` inside the action — enables inline error display (e.g. slug taken). `revalidatePath` still runs server-side before return.
- **`components/admin/CollectionTable.tsx` added** (1 file beyond the plan's 14) as the client parallel to the planned `ProductTable`, needed for the destructive-confirm delete (a server-component page can't host the `confirm()` handler).

## Files
app/admin/products/{actions.ts,page.tsx,new/page.tsx,[id]/edit/page.tsx} · app/admin/collections/{actions.ts,page.tsx,new/page.tsx,[id]/edit/page.tsx} · components/admin/{ProductForm,ProductTable,SizeStockEditor,ImageUrlEditor,CollectionPicker,CollectionForm,CollectionTable}.tsx
