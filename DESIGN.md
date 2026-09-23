---
name: Nostalgia
description: Nostalgic luxury streetwear storefront — editorial, flat, and sharp-cut
colors:
  bolt-cream: "#FFFFFF"
  aged-bolt-cream: "#F5F5F5"
  ledger-ink: "#000000"
  pencil-ink: "#595959"
  thread-sepia: "#000000"
  waxed-thread: "#8A8A8A"
  raw-thread: "#B3B3B3"
  rule-grey: "#E5E5E5"
  error-red: "#9B2C2C"
typography:
  display:
    fontFamily: "Bodoni Moda, Didot, Georgia, serif"
    fontSize: "clamp(3.25rem, 15vw, 10rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Bodoni Moda, Didot, Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bodoni Moda, Didot, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "-0.006em"
  control:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.01em"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.28em"
  micro:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.2em"
  micro-tight:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "9px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  none: "0px"
  sm: "2px"
  full: "9999px"
  sheet: "12px"
spacing:
  xs: "0.75rem"
  sm: "1.25rem"
  md: "2rem"
  lg: "4rem"
  xl: "6rem"
components:
  button-primary:
    backgroundColor: "{colors.ledger-ink}"
    textColor: "{colors.bolt-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "14px 32px"
  button-primary-hover:
    backgroundColor: "{colors.thread-sepia}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ledger-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "14px 32px"
  button-outline-hover:
    backgroundColor: "{colors.ledger-ink}"
    textColor: "{colors.bolt-cream}"
  badge-count:
    backgroundColor: "{colors.ledger-ink}"
    textColor: "{colors.bolt-cream}"
    rounded: "{rounded.full}"
  input-text:
    backgroundColor: "{colors.bolt-cream}"
    textColor: "{colors.ledger-ink}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
---

# Design System: Nostalgia

## Overview

**Creative North Star: "The Tailor's Archive"**

Nostalgia is a tailor's ledger, not a costume box. Every surface behaves like it was
cut, not decorated: sharp corners, flat planes, restrained ornament, and a single
accent color spent as rarely and precisely as a maker signs their work. The "nostalgic"
half of the brand lives in the editorial serif display and the film-grain atmosphere
over the page — the *memory* of an era. The "luxury" half lives in what the system
*refuses* to do: no gradients, no soft shadows, no rounded-card softness, no ornament
that isn't load-bearing. Craft and materials are the claim; nostalgia is the mood the
craft is presented in, never the other way around.

The system is confident and tactile rather than shy — buttons commit to full-block
color and an assertive hover shift to the accent, type runs large and black-weight at
the display size, and the marquee band never apologizes for taking up space. But that
confidence is expressed through precision (alignment, tracking, exact padding), not
through decoration. **Anti-reference:** this system explicitly does not look like loud
streetwear graphics, hype-logo drop culture, or graphic-tee visual noise — the claim is
craft and materials, not costume.

**Key Characteristics:**
- Zero-radius, flat-by-default surfaces; shadow is a rare, ambient exception, never a
  default treatment.
- Black and white only. There is no accent hue; emphasis is carried by weight of
  grey, scale, and reversal (black-on-white ↔ white-on-black).
- Display type is large, black-weight, and serif; everything navigational or
  categorical is small, uppercase, and wide-tracked.
- Atmosphere comes from a fixed film-grain overlay and photographic hover crossfades,
  not from gradients or drop shadows.

## Colors

Pure black and white, with a short ladder of true-neutral greys (R = G = B) between
them. There is no accent hue anywhere in the product — no cream, no sepia, no
tinted grey. The legacy token names (`cream`, `ink`, `sepia*`) survive in the code
but all resolve to neutrals. Dark mode is the same system reversed.

### Neutral
- **White** (`#FFFFFF`, token `cream`): The page ground in light mode; primary
  content colour in dark mode.
- **Raised** (`#F5F5F5`, token `cream-dark`): Secondary surface — footer, raised
  panels, image placeholders. `#141414` in dark mode.
- **Black** (`#000000`, tokens `ink`, `sepia`, `shade`): Primary text, the wordmark,
  primary button fill, selection, focus ring. `sepia` = ink, so every legacy accent
  usage goes black.
- **Soft** (`#595959`, token `ink-soft`): Secondary body copy — 7.0:1 on white.
- **Label** (`#8A8A8A`, token `sepia-deep`): 11–12px letterspaced micro-labels only.
- **Label on black** (`#B3B3B3`, token `sepia-light`): the same label on a black ground.
- **Rule** (`#E5E5E5`): hairlines and dividers in email templates.

### Functional
- **Error** (`#9B2C2C`): the only non-neutral colour, reserved for destructive and
  error states (cancelled orders, form errors, delete links). Never decorative.

### Named Rules
**Black and white, nothing else.** Emphasis is achieved by reversal (a black band
on a white page, white type on black), by weight of grey, and by scale — never by
hue. Photography is darkened with black scrims (`shade`), never tinted.

## Typography

**Display Font:** Bodoni Moda (with Didot, Georgia, serif fallback), loaded as
`--font-bodoni` in `lib/fonts.ts` and mapped to Tailwind's `font-serif`.
**Body Font:** Inter (with system-ui, sans-serif fallback), `--font-inter` → `font-sans`.

**Character:** A high-contrast didone paired with a restrained grotesque. The
thin/thick stroke split in Bodoni *is* the identity, which is why it is set at
**400 and never bolder** — weight fills in the hairlines and destroys the contrast
that makes the mark read as a fashion house rather than a shop. It is used only at
display scale; a didone at body size is unreadable. Inter carries everything the
didone does not, kept deliberately quiet so the wordmark is the only thing with a
voice.

Both faces are **vendored** in `app/fonts` and loaded through `next/font/local`
in `lib/fonts.ts`, never `next/font/google`: the Google loader resolves at compile
time, so a networkless `npm run dev` fails while building the root layout and
takes every route down with it.

> **Corrected (typography pass).** The code had collapsed both stacks onto
> Bodoni, so `font-sans` resolved to the didone and every paragraph, label,
> price and nav link was set in it. Below ~16px its hairlines fall under a
> device pixel and drop out — which is why the secondary greys had drifted
> near-black and the `.kicker`/`.eyebrow` utilities had been pushed to 600.
> Those were props under a face doing a job it was never drawn for. `sans` is
> Inter again and the props are gone (both utilities back to 500).

**Reading defaults**, set once on `body` rather than retyped per component:
`font-optical-sizing: auto` so Inter's opsz axis picks the right cut per size,
`line-height: 1.7`, `letter-spacing: -0.006em`. Body copy is capped by the
`.measure` utility at **62ch / 16px / 1.75** — past roughly 75 characters the eye
loses the line return, which is the other half of "hard to read".

> **Superseded:** this system previously specified Fraunces at weight 900. The
> wordmark redesign replaced it. Anything still referencing Fraunces or
> `--font-fraunces` is stale.

### Hierarchy
- **Display** (400, `clamp(3.25rem, 15vw, 10rem)`, line-height 1, tracking -0.015em):
  The wordmark lockup only. Set by `components/Wordmark.tsx` — never typed by hand,
  so the ® and the tracking cannot drift between the nav, footer, and hero.
- **Headline** (400, `clamp(2rem, 5vw, 3.75rem)`, line-height 1.02, tracking -0.02em):
  Section headings. Negative tracking tightens the didone's natural looseness at scale.
- **Title** (400, 1.125–1.5rem, line-height 1.2): Product names, cart/modal headings.
- **Body** (400, **16px**, line-height **1.75**, tracking -0.006em): Descriptive
  copy, product details, and every lede. Capped at **62ch** by `.measure`. Max ~65ch
  where prose runs long (shipping/returns pages).
- **Control** (500, 13px, tracking 0.01em, **sentence case**): Buttons and links.
- **Label / kicker** (500, 11px, tracking 0.28em, uppercase): Section kickers
  ("THE CAMPAIGN"), the marquee, status and category badges.
- **Micro** (500, 9–10px, tracking 0–0.2em): The tier below Label, for type that
  rides *inside* another element rather than sitting in the layout — the cart and
  wishlist count badges (9px on phones, 10px from `md:`) and the category badge
  laid over a product image. Never used for anything read as a sentence.

**Wordmark sizing is not a ramp step.** `components/Wordmark.tsx` is sized per
context through its `className` (1.6–1.8rem in the nav, 1.7rem in the footer,
`clamp()` at display scale) because the lockup has to optically match whatever
surface it sits on. Literal sizes on the Wordmark are correct by design.

### Named Rules
**The Wordmark Rule.** "Nostalgia" is always set through `components/Wordmark.tsx`,
never as loose text. It is the loudest element on any page, and nothing competes with
it — which is what licenses the quiet, sentence-case controls below.

**The Eyebrow Rule.** Any label that categorizes or contextualizes content (section
kickers, category badges, the marquee) is uppercase, wide-tracked (≥0.28em), and small
— never the accent color at rest, only Pencil Ink or the AA-safe Waxed Thread.

**The Contrast Rule.** Bodoni is never set over a busy photograph. Where the wordmark
sits on an image it gets a heavy scrim (≥55% shade) so the hairlines survive.

## Layout

A centered `max-w-7xl` container (`container-x`, horizontal padding **24px mobile
/ 40px `sm:` / 64px `lg:`**) governs nearly every page. The gutter is part of the
composition, not a safety margin: at 20/32 the content ran to the edge of a large
display and the page had no margin to sit in.

Sections breathe generously. The step between chapters is the `.section-y` utility
(**`py-28` / `md:py-40`**), so the rhythm is decided once rather than retyped as
`py-24 md:py-32` in eight places. The hero is a full **stage** (`min-h-[92svh]`),
not a banner — at `py-24` the photograph was a squeezed strip with the entire
lockup crammed into it.

Grids are simple and content-driven: two-column at `md:` for hero copy/image and
footer link groups (expanding to four columns), a responsive product grid elsewhere.
The primary nav is `sticky top-0`, fixed at `h-16`, with a translucent
`bg-cream/85` + `backdrop-blur` so content scrolls beneath it without fully
disappearing. Below `md:`, navigation collapses to a hamburger toggle revealing a
stacked link list; there is no separate "mobile design," only the same components at
narrower measure.

## Elevation & Depth

The system is flat by default and gets its sense of depth from **texture, not
shadow**: a fixed, low-opacity (0.045) film-grain overlay sits above the entire page,
and product imagery crossfades to a second photo on hover rather than lifting. Shadow
(`shadow-xl`) appears in exactly two places — the cart drawer panel and the size-guide
sheet — and even there it reads as a soft, ambient cue that a panel is floating over
the page, not a structural signal carried anywhere else in the system. No card,
button, or nav element ever carries a shadow.

### Shadow Vocabulary
- **Overlay ambient** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` — Tailwind `shadow-xl`): The only shadow in the system. Reserved for slide-in / floating overlay panels (cart drawer, size-guide sheet) exclusively.

### Named Rules
**The Flat-by-Default Rule.** Nothing gets a shadow simply for being a "card" or a
button. Depth is earned only by panels that visually float above the entire page.

## Shapes

Zero border-radius is the system's resting state — buttons, product image containers,
cards, inputs, and borders are all sharp-cut rectangles. Radius is reserved for two
narrow, deliberate exceptions: small circular elements (`rounded-full` — cart/wishlist
count badges, the wishlist heart trigger, moderation status pills) and the two
overlay panels' rare soft corners (`rounded-sm` on inline status pills and admin
thumbnail placeholders; `rounded-xl`/`rounded-t-xl` on the size-guide sheet only, as a
bottom-sheet convention on mobile). Borders are thin and low-contrast at rest
(`border-ink/10` to `/25`), shifting to full-strength Thread Sepia only on focus.

### Named Rules
**The Sharp-Cut Rule.** Any surface that is structural — a button, a product image, a
card, an input, a page section border — carries zero radius. If something needs a
curve, it must be a badge, a pill, or one of the two named overlay panels; there is no
in-between "slightly rounded" surface anywhere in the system.

## Components

Every control is **tactile and confident**: full-commitment fills (not tinted or
ghosted), an assertive hover shift straight to the accent color, and wide-tracked
uppercase labels that make even small controls feel deliberate rather than default.

### Buttons
- **Shape:** Zero radius, always (`{rounded.none}`).
- **Primary:** Ledger Ink fill, Bolt Cream text, `padding: 14px 32px`, label
  typography (uppercase, 0.18em tracking, font-weight 500–700). Full-commitment block
  color — never an outline or ghost as the primary action.
- **Outline:** Transparent fill, 1px Ledger Ink border, Ledger Ink text; same padding
  and label typography as primary.
- **Hover / Focus:** Primary hovers straight to Thread Sepia fill; outline hovers to a
  full Ledger Ink fill with Bolt Cream text (i.e., it becomes the primary button on
  hover). Focus adds the global `:focus-visible` Thread Sepia outline (2px, 2px
  offset) on top of whichever hover/rest fill is active — outlines are never
  suppressed.

### Badges / Pills
- **Count badges** (cart, wishlist): `rounded-full`, Ledger Ink fill, Bolt Cream text,
  10px label type, sized to the digit (`min-width` not a fixed circle).
- **Status pills** (order/fulfillment status): `rounded-sm`, small (`text-xs`),
  semantic background per status, always paired with text — color is reinforcement,
  never the only signal.
- **Moderation pills:** `rounded-full`, uppercase, 11px, widest tracking (0.1em) —
  the one pill style that borrows the badge treatment instead of the status-pill
  treatment, reserved for admin moderation states.

### Cards / Containers (Product Card)
- **Corner Style:** Zero radius.
- **Background:** Aged Bolt Cream, visible only until the product image fills it.
- **Shadow Strategy:** None — see Elevation & Depth. Interest comes from the
  image-swap hover and the scale-to-1.04 zoom, not elevation.
- **Border:** None.
- **Internal Padding:** No padding around the image (edge-to-edge); a small gap
  (`mt-3`) separates image from the name/price caption below it.
- **Behavior:** A second product photo (if present) crossfades in on hover
  (`opacity 0→100`, 500ms) while the primary photo scales to 1.04 (700ms
  ease-out) — both disabled under `prefers-reduced-motion`. A category eyebrow badge
  sits top-left over the image; the wishlist trigger sits top-right.

### Inputs / Fields
- **Style:** Zero radius, 1px `border-ink/25`, Bolt Cream background, no shadow or
  glow at rest.
- **Focus:** Border shifts to full-strength Thread Sepia; the global `:focus-visible`
  outline (2px Thread Sepia, 2px offset) applies on top. That border-color shift plus
  the outline is the *entire* focus treatment — no box-shadow ring, no glow.
- **Placeholder:** Pencil Ink at reduced opacity (60%).

### Navigation
Sticky, translucent (`.glass-panel` — **0.72 fill** light, 0.70 dark, plus backdrop
blur and saturate), `h-16` rising to `lg:h-20`. The fill sits where it does because
the header now meets the hero photograph directly: at 0.50 the 13px links measured
~4.3:1 against the lit part of the sky, under AA.

Every control in the bar speaks in **one register** — 13px, medium, sentence case,
0.01em tracking. It used to carry two at once: sentence-case section links beside
14px BOLD UPPERCASE 0.18em account/wishlist/cart controls inches away. The wordmark
is the only loud thing in the bar, and that is exactly what licenses the quiet
controls under it. Links are Pencil Ink, shifting to Ledger Ink on hover with an
animated underline
(`link-underline` — a bottom border that grows from 0 to full width). The wordmark is
center-anchored, Display-family, black-weight. Cart and wishlist sit right-aligned
with `rounded-full` Ledger Ink count badges. Below `md:`, the link list collapses
behind a hamburger toggle and reappears as a stacked list under the header.

### Marquee (signature component)
A full-width Ledger Ink band (`border-y border-ink/15`) carrying an infinitely
scrolling strip of uppercase, wide-tracked (0.3em) phrases in Bolt Cream, separated by
a Thread Sepia `✦` glyph. This is the system's most distinctive recurring device —
it's where the brand's confidence and the accent color's scarcity rule meet: the only
place Thread Sepia appears purely as a divider mark rather than an interactive state.
Disabled to a static strip under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** keep every structural surface — buttons, product imagery, cards, inputs,
  section borders — at zero radius (The Sharp-Cut Rule).
- **Do** spend Thread Sepia only on hover states, focus outlines, ratings, and the
  marquee divider — never as a resting decorative fill (The One Accent Rule).
- **Do** set anything navigational or categorical (nav links, eyebrows, button
  labels, the marquee) in uppercase, wide-tracked label type (The Eyebrow Rule).
- **Do** let the film-grain overlay and the product-image hover crossfade carry
  texture and motion interest instead of gradients or shadows.
- **Do** pair the Thread Sepia `:focus-visible` outline with an input's border-color
  shift as the only focus treatments — never a box-shadow ring or glow.

### Don't:
- **Don't** add a drop shadow to a button, card, or product image — `shadow-xl` is
  reserved for the cart drawer and size-guide sheet only, and even there it's ambient,
  not structural (The Flat-by-Default Rule).
- **Don't** round the corners of a structural surface — radius is reserved for
  circular badges/pills and the size-guide bottom sheet, nothing in between.
- **Don't** reach for loud streetwear graphics, hype-logo treatments, or drop-culture
  visual noise — confirmed anti-reference; the brand claim is craft and materials.
- **Don't** invent specific fabric, construction, or material claims in copy near
  these components — PRODUCT.md records those as undecided, owner-supplied facts.
- **Don't** drift the locked palette, type pairing, grain, or marquee device — they
  are durable brand identity, not a page-level styling choice.
