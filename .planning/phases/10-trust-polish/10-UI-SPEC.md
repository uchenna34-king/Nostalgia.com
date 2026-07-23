---
phase: 10
slug: trust-polish
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-23
---

# Phase 10 — UI Design Contract

> Visual and interaction contract for Trust & Polish: reviews/ratings, size guides, a
> consent-gated analytics banner, and shipping/returns policy pages. All five surfaces are
> **storefront** (not `/admin`), so they render inside `AppFrame`'s full chrome — film-grain,
> `Nav`, `Footer`, `CartDrawer` — and must read as continuations of the existing "nostalgic
> luxury streetwear" storefront, not a bolted-on feature. They extend `ProductCard.tsx`,
> `AddToCart.tsx`, `Footer.tsx`, and `app/product/[slug]/page.tsx` in place — no new visual
> language is introduced. Generated for gsd-ui-checker verification.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — hand-rolled Tailwind (matches storefront M1 + Phase 8 + Phase 9; no shadcn/radix anywhere in the codebase) |
| Preset | not applicable |
| Component library | none (bespoke Tailwind, same approach as every prior phase) |
| Icon library | none — inline SVG (viewBox 24×24, `stroke`/`fill="currentColor"`), matching the existing `WishlistButton.tsx`/`Hero.tsx` convention |
| Font | Fraunces (serif, headings/display) + Inter (sans, body/labels) via `var(--font-fraunces)` / `var(--font-inter)` — unchanged from M1 |

**shadcn gate note:** `components.json` is absent and the stack is Next.js 14 App Router, which would normally trigger the shadcn init prompt. This project has consistently declared `Tool: none` since Phase 1 (storefront) and Phase 9 (admin) — every existing interactive surface (`CartDrawer`, `Gallery`, `FilterPanel`, admin tables) is bespoke Tailwind. Introducing shadcn now, three phases before go-live, would fork the component approach mid-project for no functional gain. Carried forward as `none` rather than re-prompted, consistent with `<upstream_input>` guidance to not re-ask what prior phases already settled.

---

## Spacing Scale

Declared values (multiples of 4; Tailwind default scale — identical to the scale already in production use):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gaps between stars in a rating row, icon-to-text gaps |
| sm | 8px | Compact control spacing (star input hit-area gaps, banner button gap) |
| md | 16px | Default element spacing, size-guide table cell padding, review-list item internal spacing |
| lg | 24px | Review-list item vertical padding, modal content padding, policy-page paragraph rhythm |
| xl | 32px | Modal/drawer padding, gap between PDP body and the reviews section |
| 2xl | 48px | Policy-page section breaks (`h2` to `h2`), consent-banner vertical padding |
| 3xl | 64px | Policy-page top-level `py-16` |
| 4xl | 96px (`mt-24`) | Major page-level section break — matches the pre-existing `Footer`/related-products spacing already shipped in M1/Phase 8; not a new value, documented for consistency with the reviews section's placement below the PDP body |

Exceptions: interactive icon-only controls (modal close button, star-input buttons, banner dismiss) use a **44×44px minimum hit target** on all breakpoints per WCAG 2.5.5/PERF-01, even where the visible glyph is smaller (e.g. a 20px star sits inside a 44px `<button>`).

---

## Typography

Phase 10 introduces **zero new sizes or weights**. Every surface below reuses the exact scale already shipped in M1/Phase 8 (`font-black` = 900 for Fraunces headings, default 400 for Inter body, `font-medium` = 500 for Inter labels/buttons/nav):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px (`text-base`, default) | 400 (Inter) | 1.5 (`leading-relaxed`) |
| Label | 12px (`text-xs`) uppercase `tracking-[0.2em]`–`tracking-[0.25em]` | 500 (Inter) | 1.4 |
| Heading | 24–30px (`text-2xl`/`text-3xl`, Fraunces) — section titles ("Reviews", "Size guide", policy `h2`s) | 900 `font-black` | 1.2 |
| Display | 36–48px (`text-4xl`/`text-5xl`, Fraunces) — PDP `h1` (unchanged), policy-page `h1` | 900 `font-black` | 1.1 (`leading-tight`) |

Secondary/meta text (review author, date, "Verified purchase" tag, table units) uses `text-xs`/`text-sm text-ink-soft`, matching Footer/Nav conventions — not a new role, a reuse of the existing `text-ink-soft` treatment.

---

## Color

60/30/10 discipline, unchanged palette:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F4EEE4` (cream) | Page background, modal surface, policy-page background |
| Secondary (30%) | `#E8DFCF` (cream-dark) | Review-list item background/dividers, size-guide table header row + zebra rows, empty-star fill background context |
| Accent (10%) | `#A6552F` (sepia) | See reserved list below only |
| Destructive | `#9B2C2C` (reused from Phase 9's token — muted brick, palette-harmonious) | Review-submission error text, form validation errors, admin review-delete action |

**Accent (sepia) reserved for:** filled star-rating glyphs (rating summary, review list, product-card compact rating), the "Verified purchase" eyebrow tag, inline text links ("Size guide" trigger, `/shipping` and `/returns` links in Footer + PDP, all via the existing `.eyebrow`/`link-underline` utilities), and focus-ring color. **Not** used for the consent-banner accept button or the review-submit button — those stay ink-primary (`.btn-primary`: `bg-ink text-cream hover:bg-sepia`), matching every existing primary CTA in the app. Sepia never appears as a full button fill in this phase, only as text/glyph/link accent — consistent with how it's used everywhere else in the storefront.

---

## Screen & Interaction Contracts

### 1. Reviews on the PDP (TRST-01)

**Aggregate rating summary** — sits directly under the PDP `h1`/price block, above the description, as a new inline row: `★★★★☆ 4.6` (font-serif `text-3xl` average number) + a 5-star row (sepia filled / `ink/25` outline, rounded to nearest half-star for display) + `(12 reviews)` in `text-sm text-ink-soft`, wrapped in a link that scroll-anchors to the review list (`href="#reviews"`, `link-underline`). This exact average is the same number injected into the Product JSON-LD `aggregateRating` (SEO-01) — one source, no discrepancy. **Zero-reviews state:** replace the row with plain text "No reviews yet — be the first to review this product." (no stars rendered, no fake zero-star row), and the JSON-LD omits `aggregateRating` entirely per D-04.

**Review list** (`id="reviews"` anchor target, below the PDP body/related-products area): each review is a bordered block (`border-t border-ink/10 py-6`, matching the `CartDrawer` item-divider pattern) containing, top to bottom:
- Star row (20px stars, sepia filled/`ink/25` outline) + numeric equivalent for screen readers (`aria-label="4 out of 5 stars"` on the row; the visual stars are `aria-hidden`).
- Title: `font-serif text-lg` ink.
- Body (if present): `text-sm text-ink-soft leading-relaxed`.
- Meta row: reviewer first name + a `<span className="eyebrow inline-flex items-center gap-1">` "Verified purchase" tag (small inline checkmark SVG, `aria-hidden`, 12px, sepia) + relative date (`text-xs text-ink-soft`, e.g. "3 weeks ago").

Pagination: show the first 5 reviews; a `.btn-outline` "Load more reviews" button appears below when more exist. No infinite scroll — a discrete, keyboard-reachable button, consistent with the rest of the storefront's explicit-action pattern (e.g. `FilterPanel`'s controls, not auto-loading).

**Submit-review form** — visible only to signed-in verified purchasers (D-01), rendered below the review list inside the same `#reviews` section, in a bordered card (`border border-ink/10 p-6`, `bg-cream-dark/40`):
- Star input: 5 clickable star buttons (28px each inside a 44×44px hit target), operable via keyboard (`role="radiogroup"` with `aria-label="Rating"`, each star a `role="radio"` + `aria-checked`, arrow-key navigation, Enter/Space to select) — mirrors the `AddToCart` size-selector's button-group pattern, not a native `<input type="radio">` set, but with equivalent keyboard semantics.
- Title: `<input type="text">` required, same field styling as `SignInForm`'s inputs (`border border-ink px-6 py-3.5`).
- Body: `<textarea>` optional (per D-03's lean), same border treatment, `rows={4}`.
- Submit: `.btn-primary` "Post review".

States:
- **Not eligible — signed out:** "Sign in with a verified purchase to leave a review." (`text-sm text-ink-soft`) + a `.btn-outline` "Sign in" button (triggers the existing `signIn()` flow from `Nav.tsx`).
- **Not eligible — signed in, no purchase:** "Reviews are open to customers who've purchased this item." (`text-sm text-ink-soft`, no CTA — informational only).
- **Already reviewed:** "You've already reviewed this product." + a `link-underline` "View your review" affordance that scroll-anchors to their own entry in the list (highlighted with a `border-l-2 border-sepia` marker so they can find it).
- **Submitting:** submit button becomes `disabled`, label changes to "Posting…"; all fields `disabled`.
- **Success:** form is replaced in place by an inline confirmation, `role="status" aria-live="polite"`: "Thanks — your review is live." The new review appears at the top of the list (not the bottom), so the submitter sees it immediately.
- **Error:** an inline banner above the form fields, `role="alert" aria-live="assertive"`, destructive-red text: "Couldn't post your review — check the fields and try again."

**Star glyph:** a single 5-point star SVG path (24×24 viewBox), reused at three sizes — 16px (product-card compact rating), 20px (review list, aggregate summary), 28px (submit-form input). Filled = `fill="currentColor" text-sepia`; empty = `fill="none" stroke="currentColor" stroke-width="1.5" text-ink/25` — same `fill`-toggle technique already used in `WishlistButton.tsx`. Every star row **always** pairs the glyph with a numeric/text equivalent (`aria-label`, or adjacent visible text like "4.6") — color/shape alone never conveys the rating (WCAG 1.4.1).

### 2. Compact rating on product cards

Inserted into `ProductCard.tsx` as a new line directly beneath the existing `mt-3 flex items-baseline justify-between` name/price row: `mt-1 flex items-center gap-1 text-[11px] text-ink-soft`, containing 5 small (12px) stars + `(N)`, e.g. "★★★★☆ (24)". This does not touch the image, badge, or wishlist-button layer — it only adds one short row below price, preserving the grid's existing rhythm and card height variance (cards without reviews are simply one line shorter, which the CSS grid already tolerates since card heights aren't equalized today).

**Zero-reviews behavior on cards:** omit the rating row entirely — no "No reviews yet" text, no empty star row. Grid density and scan-ability matter more here than on the single-product PDP; an empty-state sentence would create visual noise across a 24-card page (Phase 8's `PAGE_SIZE`). This intentionally differs from the PDP's textual empty state.

### 3. Size guide modal (TRST-02)

**Trigger:** a `text-xs uppercase tracking-[0.15em] text-sepia link-underline` "Size guide" link placed inside `AddToCart.tsx`'s existing `mb-2 flex items-center justify-between` row — on the right side, alongside (not replacing) the existing size-error message slot: `<p className="eyebrow">Size</p>` stays left; the "Size guide" trigger sits right, and the "Select a size" error (when present) renders above/instead of the trigger on that same line on narrow viewports (stack via `flex-wrap` rather than overlapping).

**Presentation:** centered dialog on desktop (`sm:` and up — `max-w-lg`, `bg-cream`, `border border-ink/10`, `shadow-xl`, vertically/horizontally centered over the `bg-ink/40` backdrop); a bottom sheet on mobile (`<640px` — full-width, slides up from the bottom, rounded top corners, capped at `max-h-[85vh]` with internal scroll). This mirrors `CartDrawer`'s slide-transition technique but anchored bottom (not right) on mobile, center on desktop.

**Content:** the table for the product's **own category only** (Outerwear / Knitwear / Tees / Accessories per D-05) — no category switcher this phase, since the modal is opened in the context of one product. Semantic `<table>` with a `<caption>` "{Category} size guide", `<th scope="col">` per measurement column (e.g. Outerwear: Size, Chest, Length, Sleeve), row per size (XS–XL). Units: each cell shows "in (cm)" format (e.g. `38 (96.5)`) — no interactive unit toggle, keeping the placeholder-data feature simple and fully static per D-07.

**Responsive table behavior:** on mobile, wrap the `<table>` in an `overflow-x-auto` container so it scrolls horizontally rather than reflowing into stacked cards — preserves row/column relationships for screen-reader users navigating with table semantics (do not use a card-based mobile table pattern).

**Dialog a11y contract (mandatory):**
- `role="dialog" aria-modal="true" aria-labelledby="size-guide-heading"` (heading = "Size guide — {Category}").
- Focus trap: on open, focus moves to the modal's close button; Tab/Shift+Tab cycle only within the modal.
- Escape key closes the modal.
- Scroll lock: `<body>` gets `overflow-hidden` while open; removed on close.
- Explicit close control: a "×" button top-right, `aria-label="Close size guide"`, 44×44px hit target — plus backdrop click and Escape as equivalent close paths.
- Focus restoration: closing (by any method) returns focus to the "Size guide" trigger link.
- Motion: entrance/exit is an opacity fade (desktop) / translate-y slide (mobile); both collapse to an instant show/hide under `prefers-reduced-motion: reduce` (reuse the `motion-reduce:` utility pattern already in `Gallery.tsx`).

### 4. Cookie-consent banner (ANLY-01)

**Placement:** `fixed inset-x-0 bottom-0 z-40` full-width bar — below `CartDrawer`'s backdrop/panel stacking (`z-60`/`z-70`) so the cart drawer always wins the stacking order and the banner never fights it for attention during a checkout flow. It sits above normal page content but never overlaps `Nav` (which is `top-0`).

**Visual treatment:** `bg-ink text-cream` (inverted from the page, signaling "this is chrome, not content" — distinct from the modal/banner's usual cream surfaces). Copy: `text-sm`. Accept = an inverted primary button (`bg-cream text-ink px-8 py-3.5 text-sm font-medium uppercase tracking-widest hover:bg-cream-dark` — same shape/weight as `.btn-primary` but color-inverted to sit correctly on the dark bar). Decline = a plain text button (`text-cream/70 hover:text-cream underline text-sm`), not a bordered button — visually subordinate to Accept without being hidden or disabled.

**No layout shift (CLS):** the banner is `position: fixed`, so it never participates in document flow and never pushes existing content — it appears/disappears as an overlay regardless of when the client-side consent check resolves. Initial server/first-paint render treats it as absent (no reserved space); a client-only effect (post-mount) reveals it if no stored choice exists, avoiding both CLS and a hydration flash of the banner before consent state is known.

**Persistence:** localStorage key (e.g. `nostalgia-consent`) stores `"accepted" | "declined"`. Either choice permanently dismisses the banner (never re-prompt on subsequent visits). Only `"accepted"` allows `trackEvent()` (`lib/analytics.ts`) to emit; `"declined"` and "no choice yet" both keep analytics off.

**Copy:** "We use cookie-free analytics to see what's working. No personal data, no ads." + "Accept" + "No thanks". One line on desktop; stacks copy above buttons on mobile (`<640px`).

**Keyboard/interaction:** Accept and Decline are real `<button>` elements, naturally tab-reachable; the banner is **not** a modal — it must not trap focus or block interaction with the rest of the page (a shopper can tab past it and keep browsing/checking out while it's still showing).

**Motion:** slide-up entrance (`translate-y-full` → `translate-y-0`), collapses to instant appearance under `prefers-reduced-motion: reduce`.

### 5. Policy pages `/shipping` + `/returns` (TRST-03)

**Layout:** `container-x py-16` (matches existing top-level page padding, e.g. `/cart`, `/checkout`), single-column, `max-w-2xl` measure for body copy (~65ch line length, editorial readability).

**Heading hierarchy:**
- Eyebrow above the title: `.eyebrow` "Customer Care" (sepia, uppercase, matches every other page's eyebrow-then-headline pattern, e.g. PDP's `{product.category}` eyebrow).
- `h1`: `font-serif text-5xl font-black` (identical treatment to `/cart`'s "Your bag ({count})", `/checkout`'s "Checkout").
- `h2` section headings: `font-serif text-2xl font-black mt-12` (48px above each section).
- Body paragraphs: `text-ink-soft leading-relaxed` (default 16px), `mt-4` between paragraphs within a section.
- Optional `h3` sub-points: `text-lg font-medium`, used sparingly (e.g. a "Domestic" / "International" shipping split).

**Content:** placeholder-but-plausible copy per D-12 (Claude-drafted, owner edits before go-live) — static content, not DB-backed, living in the page component or a co-located content file.

**Linked from:**
- **Footer:** add "Shipping" and "Returns" links inside the existing "The House" column, replacing the current non-functional placeholder text nodes ("Our Story", "Journal", "Stockists", "Contact" are plain `<li>` text today, not links) — the two policy links become real `<Link>`s with `link-underline`; the remaining placeholder items stay as-is (out of scope this phase).
- **PDP:** the existing bullet list below `AddToCart` (`— Made in limited runs / — Free shipping over $200 / — 30-day returns`) converts its shipping and returns lines into real links (`— <Link href="/shipping" className="link-underline">Free shipping over $200</Link>`, same for returns), keeping the exact copy and position — no new UI element added, just making already-present text actionable.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA — reviews | "Post review" |
| Primary CTA — consent banner | "Accept" |
| Size guide trigger | "Size guide" |
| Empty state heading — reviews (PDP, zero reviews) | "No reviews yet" |
| Empty state body — reviews | "No reviews yet — be the first to review this product." |
| Not-eligible (signed out) | "Sign in with a verified purchase to leave a review." |
| Not-eligible (signed in, unpurchased) | "Reviews are open to customers who've purchased this item." |
| Already-reviewed | "You've already reviewed this product." |
| Submitting state | "Posting…" |
| Success state | "Thanks — your review is live." |
| Error state — reviews | "Couldn't post your review — check the fields and try again." |
| Consent banner body | "We use cookie-free analytics to see what's working. No personal data, no ads." |
| Consent banner decline | "No thanks" |
| Destructive confirmation — admin review removal | Reuses the Phase 9 admin pattern: "Delete this review? It will no longer appear on the storefront. This can't be undone." (moderation surface itself is out of scope for this UI-SPEC per the phase's scope fence — noted for consistency only.) |

Voice: same "quiet luxury editorial" tone as the rest of the storefront (M1) — calm, declarative, no exclamation points, no urgency copy. Error copy states the problem and the next step, never blames the customer.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none (not using shadcn) | not required |
| third-party | none | not required |

No component-registry installs — all Phase 10 UI is hand-rolled Tailwind extending existing storefront components (`ProductCard`, `AddToCart`, `Footer`), consistent with every prior phase.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
