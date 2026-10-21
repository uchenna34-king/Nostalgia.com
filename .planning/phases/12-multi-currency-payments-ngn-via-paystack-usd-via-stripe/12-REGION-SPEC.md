# Phase 12 — Region & currency picker (D-33)

**Decided by the owner on 2026-10-21:** "Region & currency picker" over the ₦/$ toggle alone, and
"Naira and dollars only" (no further currencies). This spec **supersedes UI-SPEC Surface 1** (the nav
currency toggle) and **UI-SPEC A-19** (checkout country prefill). Everything else in 12-CONTEXT and
12-UI-SPEC stands.

## What the shopper gets

- One control, in three places: the nav bar (lg and up), the mobile menu sheet, and the footer. It
  shows where the order ships and the currency prices are in, e.g. `NG · ₦ NGN`.
- It opens a dialog with two choices: **Ship to** (every shippable country, Nigeria first) and
  **Currency** (₦ NGN / $ USD). Saving applies both at once.
- First visit: both are defaulted from the visitor's country (`x-vercel-ip-country`). Nigeria → ship to
  Nigeria, naira. Elsewhere → that country, dollars. No header (local dev) → Nigeria, naira.
- **The currency follows the country** while the dialog is open: picking Ghana moves the currency to
  dollars, picking Nigeria moves it back to naira. Once the shopper picks a currency in the dialog
  (choosing the one that's already on counts), a later country change leaves it alone. A saved
  currency that differs from its country's usual one counts as already picked.
- The dialog shows the delivery fee for the chosen country and currency, from `lib/shipping.ts`
  (`Delivery to Ghana: $40, free on orders over $500.`). The rates are D-16 placeholders until the owner
  confirms real ones; the copy follows them automatically.
- Checkout starts with **Country = the ship-to region** instead of always Nigeria. From then on the
  address form is the authority: changing the region in the nav while on /checkout doesn't move the form.

## Storage (cookies only, so cached pages stay static)

| Cookie | Value | Set by | Read by |
|--------|-------|--------|---------|
| `nostalgia-currency` (exists) | `NGN` \| `USD` | middleware (first visit), the dialog | `CURRENCY_SCRIPT` → `<html data-currency>`, `getCurrency()`, CurrencyContext |
| `nostalgia-region` (new) | a shippable ISO 3166-1 alpha-2 code | middleware (first visit, or when only this one is missing), the dialog | `REGION_SCRIPT` → `<html data-zone>`, CurrencyContext |

Both are `Path=/; Max-Age=31536000; SameSite=Lax` (+ `Secure` on https), not httpOnly. A value off the
allow-list is replaced by the middleware and ignored by the client. The middleware matcher has one
entry per cookie, so a returning visitor who already has a currency still gets a region.

`<html data-zone="international">` is set before paint when the region isn't Nigeria (absent = domestic,
like `data-currency`). `<ShipZone zone="…">` renders zone-specific copy that CSS shows or hides, the same
way `<Money>` works, so 12-16 / 12-17 can show the shopper's own free-delivery threshold on static pages.

## UI contract

Tokens, type sizes and weights are the UI-SPEC's; nothing new is introduced.

**Bar trigger (lg+)**, where the toggle sat (left of ThemeToggle): a text button in the nav's 13px medium
register, `text-ink-soft hover:text-ink`, `link-underline`. Visible text `NG · ₦` from lg, `NG · ₦ NGN`
from xl (the same width step the toggle used). `aria-label` begins with the full visible text
(`NG · ₦ NGN, ship to Nigeria, prices in Nigerian naira`), so Label in Name holds at both widths.
`aria-haspopup="dialog"`. Fixed width (56px, 88px from xl), with a same-size placeholder before mount, so
the bar never shifts. From lg to xl the bar's spacing steps tighter (links 24px apart, right cluster 16px,
32px after the wordmark): at 1024px the full spacing ran 46px short and two links broke onto two lines
(A-4). The owner's bar, with its extra Admin link, still runs short below ~1085px (pre-existing).

**Menu trigger (below lg)**, the last block of the mobile sheet (where the currency chips were): eyebrow
`Region and currency`, then one full-width row button, 44px tall, sharp-cut `border-ink/25`:
`Ship to Nigeria · ₦ NGN` on the left, `Change` (ink-soft) on the right. `tabIndex` follows the sheet.

**Footer trigger**: `Ship to Nigeria · ₦ NGN` in the bottom bar, the footer's 12.5px ink-soft register,
`link-underline`, grouped with `Terms · Privacy · nostalgia.com` (side by side from lg, stacked below).
In the footer and the menu row, `· ₦ NGN` never breaks apart when a long country name wraps.

**Dialog**: the SizeGuideModal shell (backdrop `bg-ink/40` z-60, panel z-70, bottom sheet under 640px,
centred from `sm`, `border-ink/10 bg-cream`), rendered through a portal on `<body>` because the nav's
glass panel would otherwise contain a fixed overlay. `role="dialog" aria-modal="true"`, labelled by its
heading; focus moves to the country select, Tab is trapped, Escape / backdrop / × cancel, focus returns to
the trigger, body scroll is locked.

| Part | Content |
|------|---------|
| Heading | `Region and currency` (Bodoni, text-2xl, 400) |
| Intro | `Choose where your order is going and the currency you'd like to pay in.` (text-sm ink-soft) |
| Ship to | label `Ship to` (the address form's label style), native `<select>` (the address form's control style), `countryOptions()` |
| Delivery line | `Delivery to {country}: {fee}, free on orders over {threshold}.` (text-xs ink-soft, `aria-describedby` of the select, `aria-live="polite"`: a country change can move the currency too, and this line is where that shows). `Free` replaces the fee only if a fee is ever 0 |
| Currency | `<fieldset>` + `<legend>Currency</legend>`; two radio chips (sharp-cut, 44px, `border-ink/25` / checked `border-ink bg-ink text-cream`): `₦ NGN` over `Nigerian naira`, `$ USD` over `US dollars` |
| Currency note | `Prices, delivery and checkout use this currency.` (text-xs ink-soft) |
| Save | `.btn-primary`, full width: `Save` |

**On Save**, in this order: nothing changed → just close. Otherwise write the cookies, set `data-currency`
and `data-zone` (prices and zone copy swap instantly, CSS only), update CurrencyContext, and, only if the
currency changed on a priced listing, re-run it (dropping a stale `?price=`, as the toggle did). Close,
return focus, and announce through the trigger's `role="status"`:
`Now shipping to Ghana, with prices in US dollars ($ USD).`

## Files

N `lib/region.ts`, N `tests/region.test.ts`, M `middleware.ts`, M `tests/currency-middleware.test.ts`,
M `app/layout.tsx`, M `app/globals.css`, N `components/ShipZone.tsx`, N `tests/region-css.test.ts`,
M `context/CurrencyContext.tsx`, N `components/RegionDialog.tsx`, N `components/RegionPicker.tsx`,
N `tests/region-picker.test.tsx`, D `components/CurrencyToggle.tsx`, D `tests/currency-toggle.test.tsx`,
M `components/Nav.tsx`, M `components/Footer.tsx`, M `tests/admin-link.test.tsx`,
M `components/checkout/AddressForm.tsx`, M `components/checkout/CheckoutClient.tsx`,
M `tests/checkout-components.test.tsx` (the AddressForm tests), M `tests/checkout-client.test.tsx`,
M `tests/a11y.test.tsx` (axe on the open dialog).

## Verification

Unit and component tests for every rule above; then in a browser at 375, 1024, 1100 and 1280px: the bar
doesn't wrap or collide (A-4), the trigger doesn't shift on mount, the dialog works by keyboard alone,
in light and dark mode.

**Done 2026-10-21** (headless Chrome against the dev server on a local throwaway database): the bar
holds one row at 1024 / 1100 / 1280 / 1440 with the links on one line each, and the widest code
(`MW · $ USD`) fits its box; the server-rendered placeholder is the trigger's 88px; keyboard only:
Enter opens, focus lands on the select, typing picks Ghana and moves the currency to dollars, Tab
reaches the checked chip (visible ring) then Save then wraps to ×, Save writes both cookies and both
attributes, announces, and returns focus; Escape and the backdrop cancel; a reload keeps both
attributes before hydration; the 375px sheet row and bottom-sheet dialog work in both themes, with
focus back on the row; first visits from GH / NG / KP default to GH·USD / NG·NGN / NG·USD; on /shop a
region-only save keeps `?price=` and a currency save drops it.
