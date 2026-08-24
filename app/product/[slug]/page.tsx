import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/AddToCart";
import Gallery from "@/components/Gallery";
import ProductCard from "@/components/ProductCard";
import RatingStars from "@/components/RatingStars";
import ReviewForm, { type ReviewEligibility } from "@/components/ReviewForm";
import ReviewList, { type ReviewDisplay } from "@/components/ReviewList";
import ViewProductTracker from "@/components/ViewProductTracker";
import WishlistButton from "@/components/WishlistButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getProductBySlug,
  getCatalog,
  formatPrice,
} from "@/lib/products";
import { getReviewsForProduct, hasPurchased } from "@/lib/reviews";
import { buildProductJsonLd, serializeJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};
  const image = product.images[0] ? [{ url: product.images[0] }] : undefined;
  return {
    title: `${product.name} — Nostalgia`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: image,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.description,
      images: product.images[0] ? [product.images[0]] : undefined,
    },
  };
}

/** Server-side relative date so there is no client/server hydration mismatch. */
const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function relativeDate(from: Date): string {
  const diffMs = from.getTime() - Date.now();
  const day = 86_400_000;
  const abs = Math.abs(diffMs);
  if (abs >= 365 * day) return RELATIVE.format(Math.round(diffMs / (365 * day)), "year");
  if (abs >= 30 * day) return RELATIVE.format(Math.round(diffMs / (30 * day)), "month");
  if (abs >= 7 * day) return RELATIVE.format(Math.round(diffMs / (7 * day)), "week");
  if (abs >= day) return RELATIVE.format(Math.round(diffMs / day), "day");
  if (diffMs > 0) return "just now"; // future timestamp (clock skew) — treat as now
  return "today";
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const relatedResult = await getCatalog({
    category: product.category,
    page: 1,
  });
  const related = relatedResult.products
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  const hasDetails = Boolean(product.materials || product.care);

  // Verified-purchase reviews (bounded set) for the #reviews list.
  const { reviews: reviewRows } = await getReviewsForProduct(product.id);
  const reviews: ReviewDisplay[] = reviewRows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    authorName: r.authorName.split(/\s+/)[0] || "A Nostalgia customer",
    dateIso: r.createdAt.toISOString(),
    dateLabel: relativeDate(r.createdAt),
  }));

  // Review-form eligibility, derived server-side (D-01). This drives DISPLAY
  // only — submitReview re-checks session + purchase independently on every
  // submit, so this is never the security boundary (T-10-05-01).
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  let eligibility: ReviewEligibility = "signed-out";
  let existingReview:
    | { rating: number; title: string; body: string | null }
    | undefined;

  if (userId) {
    if (!(await hasPurchased(userId, product.slug))) {
      eligibility = "no-purchase";
    } else {
      const own = await prisma.review.findUnique({
        where: { productId_userId: { productId: product.id, userId } },
        select: { rating: true, title: true, body: true },
      });
      if (own) {
        eligibility = "already-reviewed";
        existingReview = own;
      } else {
        eligibility = "eligible";
      }
    }
  }

  // Product JSON-LD (SEO-01, D-14). aggregateRating reuses the same
  // product.rating as the on-page summary, so structured data and the visible
  // number can never disagree (D-04). Escaped against <script> breakout.
  const jsonLd = serializeJsonLd(
    buildProductJsonLd({
      name: product.name,
      images: product.images,
      description: product.description,
      price: product.price,
      inStock: product.variants.some((v) => v.stock > 0),
      rating: product.rating ?? { avg: 0, count: 0 },
    }),
  );

  return (
    <main className="container-x py-10">
      <ViewProductTracker productSlug={product.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <nav className="mb-8 text-xs uppercase tracking-[0.18em] text-ink-soft">
        <Link href="/shop" className="link-underline">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span>{product.category}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <Gallery images={product.images} name={product.name} />

        {/* Details */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">{product.category}</p>
          <h1 className="mt-2 font-serif text-4xl font-black sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 text-xl text-ink-soft">
            {formatPrice(product.price)}
          </p>

          {product.rating.count > 0 ? (
            <Link
              href="#reviews"
              className="mt-4 inline-flex items-center gap-3 link-underline"
            >
              <span className="font-serif text-3xl">
                {product.rating.avg.toFixed(1)}
              </span>
              <RatingStars
                value={product.rating.avg}
                size={20}
                count={product.rating.count}
              />
              <span className="text-sm text-ink-soft">
                ({product.rating.count} review
                {product.rating.count === 1 ? "" : "s"})
              </span>
            </Link>
          ) : (
            <p className="mt-4 text-sm text-ink-soft">
              No reviews yet — be the first to review this product.
            </p>
          )}

          <p className="mt-6 max-w-md leading-relaxed text-ink-soft">
            {product.description}
          </p>

          <div className="mt-8 flex max-w-sm items-center gap-3">
            <div className="flex-1">
              <AddToCart product={product} />
            </div>
            <WishlistButton
              product={{
                slug: product.slug,
                name: product.name,
                price: product.price,
                image: product.images[0] ?? "",
              }}
              className="border border-ink/15"
            />
          </div>

          <ul className="mt-8 space-y-1 text-xs uppercase tracking-[0.15em] text-ink-soft">
            <li>— Made in limited runs</li>
            <li>
              —{" "}
              <Link href="/shipping" className="link-underline">
                Free shipping over $200
              </Link>
            </li>
            <li>
              —{" "}
              <Link href="/returns" className="link-underline">
                30-day returns
              </Link>
            </li>
          </ul>

          {hasDetails && (
            <div className="mt-8 max-w-md border-t border-ink/10 pt-6">
              <h2 className="text-xs uppercase tracking-[0.18em] text-ink">
                Materials & Care
              </h2>
              <ul className="mt-3 space-y-1 text-xs uppercase tracking-[0.15em] text-ink-soft">
                {product.materials && <li>— {product.materials}</li>}
                {product.care && <li>— {product.care}</li>}
              </ul>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 font-serif text-3xl font-black">
            More from {product.category}
          </h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section id="reviews" className="mt-24">
        <h2 className="font-serif text-3xl font-black">Reviews</h2>
        {reviews.length > 0 ? (
          <ReviewList reviews={reviews} />
        ) : (
          <p className="mt-6 text-sm text-ink-soft">
            No reviews yet — be the first to review this product.
          </p>
        )}
        <ReviewForm
          slug={product.slug}
          eligibility={eligibility}
          existingReview={existingReview}
        />
      </section>
    </main>
  );
}
