import { describe, expect, it } from "vitest";
import { buildProductJsonLd, serializeJsonLd } from "@/lib/seo";

const baseProduct = {
  name: "Wool Overcoat",
  images: ["https://example.com/overcoat-1.jpg", "https://example.com/overcoat-2.jpg"],
  description: "A heavyweight wool overcoat.",
  price: 24000,
  inStock: true,
  rating: { avg: 4.5, count: 12 },
};

describe("buildProductJsonLd", () => {
  it("builds the schema.org Product + Offer shape", () => {
    const jsonLd = buildProductJsonLd(baseProduct) as Record<string, unknown>;

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.name).toBe(baseProduct.name);
    expect(jsonLd.image).toEqual(baseProduct.images);
    expect(jsonLd.description).toBe(baseProduct.description);

    const offers = jsonLd.offers as Record<string, unknown>;
    expect(offers["@type"]).toBe("Offer");
    expect(offers.priceCurrency).toBe("USD");
    expect(offers.price).toBe((baseProduct.price / 100).toFixed(2));
    expect(offers.availability).toBe("https://schema.org/InStock");
  });

  it("sets availability to OutOfStock when inStock is false", () => {
    const jsonLd = buildProductJsonLd({ ...baseProduct, inStock: false }) as Record<
      string,
      unknown
    >;
    const offers = jsonLd.offers as Record<string, unknown>;
    expect(offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("includes aggregateRating when rating.count is greater than 0 (D-04)", () => {
    const jsonLd = buildProductJsonLd(baseProduct) as Record<string, unknown>;
    const aggregateRating = jsonLd.aggregateRating as Record<string, unknown>;

    expect(aggregateRating).toBeDefined();
    expect(aggregateRating["@type"]).toBe("AggregateRating");
    expect(aggregateRating.ratingValue).toBe(baseProduct.rating.avg.toFixed(1));
    expect(aggregateRating.reviewCount).toBe(baseProduct.rating.count);
  });

  it("omits aggregateRating when rating.count is 0 (D-04)", () => {
    const jsonLd = buildProductJsonLd({
      ...baseProduct,
      rating: { avg: 0, count: 0 },
    });

    expect(jsonLd).not.toHaveProperty("aggregateRating");
  });
});

describe("serializeJsonLd", () => {
  it("escapes '<' so no raw less-than character reaches the inline <script> (XSS mitigation)", () => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      description: 'Cozy </script><script>alert(1)</script> knit',
    };

    const serialized = serializeJsonLd(jsonLd);

    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c");
  });
});
