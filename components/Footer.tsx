import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/10 bg-cream-dark/40">
      <div className="container-x grid gap-10 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <h3 className="font-serif text-3xl font-black">NOSTALGIA</h3>
          <p className="mt-3 max-w-sm text-sm text-ink-soft">
            A clothing house built on memory — vintage editorial, quiet luxury,
            and the boldness of the street, made in limited runs.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Shop</p>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>
              <Link href="/shop" className="link-underline">
                All Products
              </Link>
            </li>
            <li>
              <Link href="/shop?category=Outerwear" className="link-underline">
                Outerwear
              </Link>
            </li>
            <li>
              <Link href="/shop?category=Knitwear" className="link-underline">
                Knitwear
              </Link>
            </li>
            <li>
              <Link href="/shop?category=Accessories" className="link-underline">
                Accessories
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">The House</p>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>Our Story</li>
            <li>Journal</li>
            <li>Stockists</li>
            <li>Contact</li>
          </ul>
        </div>
      </div>
      <div className="container-x flex flex-col items-center justify-between gap-2 border-t border-ink/10 py-6 text-xs text-ink-soft sm:flex-row">
        <span>© {new Date().getFullYear()} Nostalgia. All rights reserved.</span>
        <span className="tracking-[0.2em]">WEAR THE MEMORY</span>
      </div>
    </footer>
  );
}
