// Pure, Prisma-free SEO helpers (SEO-01, D-04/D-14). Unit-tested by
// tests/seo.test.ts. No @/lib/db import so it stays testable without a DB.

export type ProductJsonLdInput = {
  name: string;
  images: string[];
  description: string;
  price: number; // integer cents
  inStock: boolean;
  rating: { avg: number; count: number };
};

/**
 * Build a schema.org Product object (with an Offer). `aggregateRating` is
 * included ONLY when the product has reviews (D-04) so a zero-review product
 * never emits a bogus 0-star rating to search engines. Keys stay strictly on
 * the schema.org Product/Offer/AggregateRating vocabulary (Google rejects
 * freeform keys).
 */
export function buildProductJsonLd(product: ProductJsonLdInput) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images,
    description: product.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: (product.price / 100).toFixed(2),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  if (product.rating.count > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating.avg.toFixed(1),
      reviewCount: product.rating.count,
    };
  }

  return jsonLd;
}

/**
 * Serialize a JSON-LD object for an inline <script>, escaping every `<` to its
 * `<` unicode form so a `</script>` sequence in owner-entered product text
 * cannot break out of the script context (RESEARCH Pattern 4 / Pitfall 5).
 */
export function serializeJsonLd(jsonLd: unknown): string {
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}
