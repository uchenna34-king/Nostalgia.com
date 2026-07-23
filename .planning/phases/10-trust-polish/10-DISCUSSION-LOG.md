# Phase 10: Trust & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-23
**Phase:** 10-Trust & Polish
**Areas discussed:** Reviews policy, Size guides, Analytics + consent, Shipping/returns pages
**Areas deferred to defaults:** SEO (SEO-01), Performance & Accessibility (PERF-01)

---

## Reviews policy (TRST-01)

### Who can review
| Option | Description | Selected |
|--------|-------------|----------|
| Verified purchasers only | Signed in AND owns a matching Order; "Verified purchase" badge | ✓ |
| Any signed-in user | Account required, purchase not | |
| Anyone, no login | Open reviews with just a name | |

**User's choice:** Verified purchasers only — "this product review should only be for those that are signed in and have purchased the products."

### Moderation
| Option | Description | Selected |
|--------|-------------|----------|
| Auto-publish, owner can remove | Appears immediately; owner hides/deletes via /admin | ✓ |
| Owner approves each first | Pending queue before display | |

**User's choice:** Auto-publish, owner can remove.

### Format
| Option | Description | Selected |
|--------|-------------|----------|
| Star rating + title + text | 1–5 stars, title, body; aggregate on PDP/cards/JSON-LD | ✓ |
| Star rating + text only | Stars + body, no title | |
| Star rating only | Stars, no written feedback | |

**User's choice:** Star rating + title + text.

---

## Size guides (TRST-02)

### Scope
| Option | Description | Selected |
|--------|-------------|----------|
| Per-category charts | One chart per category (Outerwear/Knitwear/Tees/Accessories) | ✓ |
| One universal chart | Single chart on every product | |
| Per-product override | Category default + per-product override | |

**User's choice:** Per-category charts.

### Presentation
| Option | Description | Selected |
|--------|-------------|----------|
| Modal/drawer from PDP link | On-brand modal near the size selector | ✓ |
| Dedicated /size-guide page | Standalone page linked from PDP + footer | |
| Inline on the PDP | Expandable section in the product body | |

**User's choice:** Modal/drawer from PDP link.

### Content source
| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder data now | Structure with placeholder measurements; owner edits later | ✓ |
| You'll provide real numbers | Real measurement tables baked in now | |

**User's choice:** Placeholder data now.

---

## Analytics + consent (ANLY-01)

### Provider
| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Analytics | Web Analytics + Speed Insights; cookieless; matches deploy target; no-ops without keys | ✓ |
| Plausible | Cookieless, hosted/self-hosted | |
| GA4 | Richest, cookie-based, needs consent | |
| No-op stub now | trackEvent() abstraction; wire provider at go-live | |

**User's choice:** Vercel Analytics.

### Consent
| Option | Description | Selected |
|--------|-------------|----------|
| Cookieless, no banner | No banner needed with cookieless provider | |
| Cookie-consent banner | Banner gates analytics until accepted | ✓ |

**User's choice:** Cookie-consent banner.
**Notes:** Flagged the mild redundancy — Vercel Web Analytics is cookieless, so a banner isn't strictly required. User still wants it; captured as deliberate future-proofing / trust signal. Analytics must not initialize until consent accepted.

### Events
| Option | Description | Selected |
|--------|-------------|----------|
| Full funnel via trackEvent() | view_product, add_to_cart, begin_checkout, purchase, search | ✓ |
| Minimal | Pageviews + purchase only | |

**User's choice:** Full funnel via trackEvent().

---

## Shipping/returns pages (TRST-03)

### Structure
| Option | Description | Selected |
|--------|-------------|----------|
| Separate /shipping + /returns | Two dedicated pages, each with own metadata | ✓ |
| One combined /policies page | Single page with sections | |

**User's choice:** Separate /shipping + /returns.

### Content
| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder copy I draft | On-brand placeholder text; owner edits later | ✓ |
| You'll provide the real text | Final wording baked in now | |

**User's choice:** Placeholder copy Claude drafts.

### Linking
| Option | Description | Selected |
|--------|-------------|----------|
| Footer + PDP | Site-wide footer + surfaced on the product page | ✓ |
| Footer only | Footer link only | |
| Footer + PDP + checkout | Also on checkout/cart | |

**User's choice:** Footer + PDP.

---

## Claude's Discretion

- **SEO (SEO-01):** standard Next.js metadata/generateMetadata + sitemap.ts + robots.ts +
  Product JSON-LD (with aggregateRating). User chose "use my defaults."
- **Performance & Accessibility (PERF-01):** WCAG 2.1 AA + Lighthouse ≥90 perf / 100 a11y on
  home, shop, PDP. User chose "use my defaults."
- Exact Review schema, verified-purchase lookup, review pagination/sort, size-guide config
  shape, trackEvent() signature/payloads, consent-banner storage + copy, policy-page copy, and
  the perf/a11y remediation checklist — all planner/researcher choices.

## Deferred Ideas

- Stock auto-decrement / server-side sold-out rejection at checkout — Phase 11.
- Review photos/media — needs file-upload infra (out of scope for M2).
- Review reporting/flagging, replies, helpful-votes — future.
- Admin-editable size guides & policy pages (no-code content) — future; static now.
- GA4 / richer marketing analytics + A/B testing — beyond ANLY-01.
- Confirmation emails, order history, real OAuth/Stripe, deployment, Postgres — Phase 11.
