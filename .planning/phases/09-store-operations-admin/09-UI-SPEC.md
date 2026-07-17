---
phase: 9
slug: store-operations-admin
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-17
---

# Phase 9 — UI Design Contract

> Visual and interaction contract for the Store Operations / Admin back-office.
> Generated for gsd-ui-checker verification. The admin reuses the LOCKED storefront
> design system (cream/ink/sepia, Fraunces + Inter, hand-rolled Tailwind) but reads as
> a **denser, functional back-office** — tables and forms, not editorial marketing layout.
> No film-grain/marquee flourish inside the admin working area.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — hand-rolled Tailwind components (same approach as the storefront) |
| Preset | not applicable |
| Component library | none (bespoke Tailwind; no shadcn/radix) |
| Icon library | none — inline SVG, matching the existing storefront convention (Nav/cart icons) |
| Font | Fraunces (serif, headings/display) + Inter (sans, body, labels, tables) via `var(--font-fraunces)` / `var(--font-inter)` |

---

## Spacing Scale

Declared values (multiples of 4; Tailwind default scale):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, badge padding, table cell inline padding |
| sm | 8px | Compact control spacing, form-field label→input gap |
| md | 16px | Default element spacing, table row padding (`py-4`), card padding |
| lg | 24px | Form section padding, card gutters |
| xl | 32px | Admin content max-width gutters (`px-8`), major form-group gaps |
| 2xl | 48px | Section breaks between admin panels |
| 3xl | 64px | Page-level top spacing under the admin header |

Admin controls and tables use only the scale above — `py-3` (12px) for dense table rows, `py-4` (16px) for standard controls.

Exceptions: none. This contract declares only multiples of 4. The shared global `.btn`/`.btn-outline` classes are **reused unchanged from the storefront**; their pre-existing `py-3.5` (14px) padding is an out-of-scope global style this phase does not modify or redeclare — not a spacing value introduced by this UI-SPEC.

---

## Typography

Denser than the storefront (which uses 16px body); admin favors scannable tables/forms.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 (Inter) | 1.5 |
| Label | 12px | 500 (Inter), uppercase, `tracking-[0.15em]` | 1.4 |
| Heading | 20px | 500 (Fraunces) — panel/section titles | 1.3 |
| Display | 30px | 500 (Fraunces) — admin page title (e.g. "Products", "Orders") | 1.2 |

Eyebrow labels reuse the storefront pattern: `text-xs uppercase tracking-[0.25em] text-sepia`.
Tabular numbers (`tabular-nums`) for prices, stock counts, and order totals.

---

## Color

60/30/10 discipline. Ink is the primary foreground and primary-button fill (as in the storefront `.btn`); sepia stays a restrained accent.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F4EEE4` (cream) | Admin page background |
| Secondary (30%) | `#E8DFCF` (cream-dark) | Table headers, card/panel surfaces, admin sidebar/nav, form field fills, zebra rows |
| Accent (10%) | `#A6552F` (sepia) | See reserved list below only |
| Destructive | `#9B2C2C` (new token — muted brick, palette-harmonious) | Delete actions, destructive-confirm buttons, validation errors |

Accent (sepia) reserved for: active admin nav item, eyebrow/section labels, inline links, the current fulfillment-status pill (`fulfilled`), and focus rings. **Not** used for all buttons — the primary action button is ink (`bg-ink text-cream hover:bg-sepia`, the existing `.btn`), and secondary actions use `.btn-outline` (ink border).

Foreground text: ink `#1A1A1A` primary, ink-soft `#3A3A3A` secondary/meta. Status pills use tone-on-tone fills (e.g. cream-dark bg + ink text) with sepia reserved for the active/positive state and destructive red for `cancelled`.

---

## Screen & Interaction Contracts

Admin lives under its own `/admin` route section with a persistent left sidebar (Products · Collections · Orders) + a slim top bar showing the signed-in owner + "View store". No film-grain/marquee inside `/admin`. Every screen is owner-gated server-side; non-owners never see chrome.

- **Access gate:** unauthenticated → redirect to sign-in; authenticated non-owner → a plain 404-style "Not found" (do not reveal the admin exists). No admin nav renders for non-owners.
- **Products list (primary admin screen):** the **dense product table is the focal point**; the "Add product" ink button is the secondary anchor, top-right. Columns: thumbnail (first ProductImage), name, category, price (`tabular-nums`), total stock (sum of per-size), featured flag, and a row-actions column. Row actions are **text-label controls, not icon-only**: "Edit" (inline link / outline button) and "Delete" (destructive red), each with an explicit accessible name (e.g. `aria-label="Edit {name}"` / `aria-label="Delete {name}"`). Empty state: heading "No products yet", body "Add your first product to see it on the storefront."
- **Product form (create/edit):** single-column form, `lg` section spacing, grouped: Details (name, slug, price, category, description, materials, care) · Sizes & stock · Images · Collections. Save = ink primary "Save product"; Cancel = outline. Inline field validation in destructive red; error summary at top on submit failure.
- **Per-size stock editor:** a compact row per size (e.g. S/M/L/XL) with the size label + a number input (`tabular-nums`, min 0). A product with all sizes at 0 shows an inline "Hidden from storefront (fully sold out)" note in sepia so the owner understands the storefront effect.
- **Image URL editor:** ordered list of image rows (URL input + alt input + drag-or-arrow reorder + remove); "Add image" ghost/outline button appends a row. Small live thumbnail preview per valid URL. No file upload control.
- **Collections:** list + create/edit form (name, slug, description) and a product-assignment control (multi-select or checklist of products). Delete guarded with confirmation.
- **Orders list:** read-only table — order id (short), date, customer email, item count, total (`tabular-nums`), and a **status pill** (pending / paid / fulfilled / cancelled). Row expands or links to a detail view.
- **Fulfillment control:** on the order detail (or inline), a status `<select>` advancing pending → paid → fulfilled → cancelled, plus an optional tracking-number text input + notes textarea; "Update order" ink button. Status change gives an inline confirmation, not a modal.
- **Storefront reflection (out-of-stock):** a 0-stock size is disabled + "Sold out" in the PDP size selector; a fully-sold-out product is omitted from `/shop` and collection listings (handled in the Phase 8 catalog query, not a visual-only hide).

Motion: subtle only; honor `prefers-reduced-motion` (reuse the existing `motion-reduce` patterns). No decorative animation in the admin working area.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | "Save product" (product form) / "Add product" (list) / "Update order" (fulfillment) |
| Empty state heading | "No orders yet" (orders) · "No products yet" (products) · "No collections yet" (collections) |
| Empty state body | "Orders will appear here once customers check out — nothing to fulfill right now." |
| Error state | "Couldn't save — check the highlighted fields and try again." |
| Destructive confirmation | Delete product: "Delete '{name}'? This removes it from the storefront. Past orders keep their record. This can't be undone." |

Voice: plain, calm, owner-facing (the audience is the store owner, not a shopper) — informative over playful, while staying on-brand. Status pills read lowercase: `pending` · `paid` · `fulfilled` · `cancelled`.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none (not using shadcn) | not required |
| third-party | none | not required |

No component-registry installs — all admin UI is hand-rolled Tailwind, consistent with the existing storefront components.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-17 (gsd-ui-checker, 6/6 dimensions)
