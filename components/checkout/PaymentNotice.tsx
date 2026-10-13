"use client";

import { useEffect, useRef } from "react";

export type PaymentNoticeKind = "failed" | "cancelled" | "pending";

const COPY: Record<PaymentNoticeKind, { eyebrow: string; body: string }> = {
  cancelled: {
    eyebrow: "Payment cancelled",
    body: "You cancelled the payment, so you haven't been charged. Your bag is saved exactly as you left it, so you can pay whenever you're ready.",
  },
  failed: {
    eyebrow: "Payment didn't go through",
    body: "Your payment didn't go through, so you haven't been charged. Your bag is saved. Check your details and try again, or use a different card.",
  },
  pending: {
    eyebrow: "Confirming your payment",
    body: "We're still waiting for your bank to confirm this payment. If it goes through, we'll email your confirmation. Please don't pay again just yet.",
  },
};

export function isPaymentNoticeKind(value: unknown): value is PaymentNoticeKind {
  return value === "failed" || value === "cancelled" || value === "pending";
}

/**
 * Calm, neutral note after a provider round trip (D-21): no red, no urgency.
 * Rendered after the session resolves, so a live region inserted then might
 * not be announced; focusing it on mount makes screen readers read it.
 */
export default function PaymentNotice({ kind }: { kind: string | null | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const valid = isPaymentNoticeKind(kind);

  useEffect(() => {
    if (valid) ref.current?.focus();
  }, [valid]);

  if (!valid) return null;
  const { eyebrow, body } = COPY[kind];
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      className="mb-8 border border-ink/25 bg-cream-dark p-4 sm:p-6"
    >
      <p className="eyebrow">{eyebrow}</p>
      <p className="mt-2 text-sm text-ink">{body}</p>
    </div>
  );
}
