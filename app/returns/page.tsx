import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns — Nostalgia",
  description:
    "Nostalgia's returns policy — the 30-day window, condition requirements, how to start a return, refunds, and exchanges.",
};

export default function ReturnsPage() {
  {
    /*
      PLACEHOLDER copy (D-12): on-brand draft for the owner to replace with real,
      binding returns terms before go-live. Contains no real addresses, phone
      numbers, PII, or legal commitments.
    */
  }
  return (
    <main className="container-x py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">Customer Care</p>
        <h1 className="mt-3 font-serif text-5xl font-black">Returns</h1>
        <p className="mt-4 text-ink-soft leading-relaxed">
          We want every piece to feel right. If something is not what you hoped
          for, returning it is simple and unhurried.
        </p>

        <h2 className="font-serif text-2xl font-black mt-12">Return window</h2>
        <p className="mt-4 text-ink-soft leading-relaxed">
          You may return eligible items within 30 days of delivery. Beyond that
          window we are happy to talk through your options, though a full refund
          may no longer apply.
        </p>

        <h2 className="font-serif text-2xl font-black mt-12">
          Condition &amp; eligibility
        </h2>
        <p className="mt-4 text-ink-soft leading-relaxed">
          Items should be unworn, unwashed, and returned with their original tags
          and packaging. Final-sale pieces and made-to-order runs are not
          eligible for return unless they arrive faulty.
        </p>

        <h2 className="font-serif text-2xl font-black mt-12">
          How to start a return
        </h2>
        <p className="mt-4 text-ink-soft leading-relaxed">
          Reach out with your order reference and the pieces you would like to
          send back. We will share the return details and confirm the next steps
          before anything ships.
        </p>

        <h2 className="font-serif text-2xl font-black mt-12">Refunds</h2>
        <p className="mt-4 text-ink-soft leading-relaxed">
          Once your return is received and inspected, refunds are issued to the
          original payment method. Please allow a few business days for the
          amount to appear, depending on your bank.
        </p>

        <h2 className="font-serif text-2xl font-black mt-12">Exchanges</h2>
        <p className="mt-4 text-ink-soft leading-relaxed">
          Need a different size or colourway? Start a return for the original
          piece and place a new order for the one you want, so your preferred
          size is held before it sells through.
        </p>
      </div>
    </main>
  );
}
