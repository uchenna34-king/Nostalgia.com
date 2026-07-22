---
phase: 09-store-operations-admin
plan: 06
status: complete
completed: 2026-07-21
requirements: [ADMN-04]
---

# 09-06 Summary — Orders & fulfillment

## What was built
- **`lib/orders.ts`** (Prisma-free, unit-testable): `ORDER_STATUSES` allow-list tuple (`pending, paid, fulfilled, cancelled`), `OrderStatus` type, `isValidOrderStatus` Set-guard (mirrors `buildOrderBy`/`SORT_OPTIONS`), and `parseOrderItems` (defensive `Order.items` JSON parser → `[]` on malformed input) + `OrderItem` type.
- **`app/admin/orders/actions.ts`**: `updateOrderFulfillment(orderId, status, trackingNumber, notes)` — `requireOwner()` first; rejects any status not in `ORDER_STATUSES` (`throw "invalid_status"`) BEFORE the Prisma write; writes fields explicitly (no mass-assignment); `revalidatePath` both `/admin/orders` and the detail route. Status is freely correctable by the single trusted owner (D-12).
- **`app/admin/orders/page.tsx`** + **`components/admin/OrderTable.tsx`**: read-only dense table of ALL orders (D-11) — short id, date, customer email, item count (via `parseOrderItems`), total (`formatPrice`, `tabular-nums`), status pill (sepia `fulfilled`, red `cancelled`, neutral otherwise); empty state.
- **`app/admin/orders/[id]/page.tsx`** + **`components/admin/FulfillmentForm.tsx`**: order detail (line items from the JSON snapshot, total, customer, date) + `notFound()` on miss; client form with status `<select>` (from `ORDER_STATUSES`), tracking input, notes textarea → `updateOrderFulfillment`, inline confirmation.
- **`tests/orders.test.ts`** (TDD): `ORDER_STATUSES` order, `isValidOrderStatus` accept/reject, `parseOrderItems` valid + malformed. 5/5 pass.

## Verification
- `npx vitest run tests/orders.test.ts` → 5/5; full suite `npx vitest run` → 56/56; `npx tsc --noEmit` → exit 0.
- Access control: `app/admin/orders/actions.ts` `await requireOwner` count == `export async function` count == 1.
- In-browser (owner, against a seeded test order — customer@example.com, $460, 2 items):
  - `/admin/orders` list row: `#9g7naypa · Jul 22, 2026 · customer@example.com · 3 · $460 · paid`.
  - `/admin/orders/[id]` detail renders line items + fulfillment form (status select + tracking + notes).
  - Set status → `fulfilled` + tracking `1Z-TEST-TRACK-4821`, submitted → DB persisted (`status: fulfilled`, `trackingNumber` set) and the list pill updated to `fulfilled` (revalidate).
  - Test order deleted afterward (orders back to empty).

## Notes
- Order.items shape matches the checkout route snapshot (`{ slug, name, size, unitPrice, qty, image }`).
- Allow-list reject path proven by unit test (out-of-set/wrong-case rejected); the action throws before writing.
- Files: lib/orders.ts, app/admin/orders/{actions.ts,page.tsx,[id]/page.tsx}, components/admin/{OrderTable,FulfillmentForm}.tsx, tests/orders.test.ts.
