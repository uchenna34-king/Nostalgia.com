import ProductPageSkeleton from "@/components/ProductPageSkeleton";

// The PDP reads the session (review eligibility), so it renders per request.
// This boundary lets a card click respond immediately instead of waiting.
export default function Loading() {
  return <ProductPageSkeleton />;
}
