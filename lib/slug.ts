// URL slugs for products and collections. The admin types them by hand, so
// whatever arrives ("Orange Cotton Sweatshirt", "café crème") is turned into
// the one safe shape the storefront links to: lowercase ASCII words joined by
// hyphens. A slug with spaces once made its product page 404.

const MAX_SLUG = 80;

export function toSlug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop accents: é -> e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG)
    .replace(/-+$/g, "");
}

/**
 * The [slug] route param as it was stored. Next hands dynamic params over
 * still percent-encoded, so a slug saved before toSlug existed (with spaces)
 * arrives as "orange%20cotton%20sweatshirt" and matched nothing.
 */
export function slugParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // malformed escape: look it up as-is (it just won't match)
  }
}
