import { prisma } from "@/lib/db";
import ReviewModerationTable from "@/components/admin/ReviewModerationTable";

// Owner-gated by app/admin/layout.tsx (requireOwner render gate). The owner
// legitimately sees EVERY review including hidden ones, so this queries prisma
// directly rather than the hidden-filtered lib/reviews.ts storefront reads.
export default async function AdminReviewsPage() {
  const rows = await prisma.review.findMany({
    include: {
      product: { select: { name: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const reviews = rows.map((r) => ({
    id: r.id,
    productName: r.product.name,
    productSlug: r.product.slug,
    author: r.user.name ?? r.user.email ?? "Unknown",
    rating: r.rating,
    title: r.title,
    body: r.body ? (r.body.length > 80 ? `${r.body.slice(0, 80)}…` : r.body) : "",
    hidden: r.hidden,
    createdAt: r.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  }));

  return <ReviewModerationTable reviews={reviews} />;
}
