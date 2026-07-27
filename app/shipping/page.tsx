import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping — Nostalgia",
  description:
    "How Nostalgia processes, dispatches, and delivers orders — domestic and international timelines, rates, and tracking.",
};

export default function ShippingPage() {
  {
    /*
      PLACEHOLDER copy (D-12): on-brand draft for the owner to replace with real,
      binding shipping terms before go-live. Contains no real addresses, phone
      numbers, PII, or legal commitments.
    */
  }
  return (
    <main className="container-x py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">Customer Care</p>
        <h1 className="mt-3 font-serif text-5xl font-black">Shipping</h1>
        <p className="mt-4 text-ink-soft leading-relaxed">
          Every Nostalgia piece is made in limited runs and sent with care. Here
          is how your order travels from our studio to your door.
        </p>

        <h2 className="font-serif text-2xl font-black mt-12">
          Processing &amp; dispatch
        </h2>
        <p className="mt-4 text-ink-soft leading-relaxed">
          Orders are prepared within one to three business days. Each piece is
          inspected, folded, and wrapped before it leaves the studio. You will
          receive a confirmation the moment your order is on its way.
        </p>

        <h2 className="font-serif text-2xl font-black mt-12">
          Domestic shipping
        </h2>
        <p className="mt-4 text-ink-soft leading-relaxed">
          Standard delivery arrives within three to seven business days once
          dispatched. Shipping is a flat rate at checkout, and it is free on
          orders over $200. Expedited options are offered where available.
        </p>

        <h2 className="font-serif text-2xl font-black mt-12">
          International shipping
        </h2>
        <p className="mt-4 text-ink-soft leading-relaxed">
          We ship to most destinations worldwide. Delivery typically takes seven
          to fifteen business days depending on the region and local handling.
        </p>
        <h3 className="text-lg font-medium mt-6">Duties &amp; customs</h3>
        <p className="mt-4 text-ink-soft leading-relaxed">
          International orders may be subject to import duties and taxes set by
          the destination country. These are the responsibility of the recipient
          and are not included in the order total.
        </p>

        <h2 className="font-serif text-2xl font-black mt-12">Order tracking</h2>
        <p className="mt-4 text-ink-soft leading-relaxed">
          Once your order ships, a tracking reference is included with your
          confirmation so you can follow its journey. If tracking has not updated
          within a few days, reach out and we will look into it with you.
        </p>
      </div>
    </main>
  );
}
