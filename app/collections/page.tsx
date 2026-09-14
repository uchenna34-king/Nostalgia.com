import Link from "next/link";
import { getCollections } from "@/lib/products";

export const dynamic = "force-dynamic";

/**
 * Collections index (DISC-04, D-10): lists the seeded curated collections,
 * each linking to its own paginated detail page. Read-only browsing only —
 * collection management (create/edit) is deferred to the Phase 9 admin (D-11).
 */
export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <main className="container-x py-14">
      <header className="mb-10 text-center">
        <p className="eyebrow">Curated</p>
        <h1 className="mt-2 font-serif text-5xl font-normal sm:text-6xl">
          Collections
        </h1>
      </header>

      {collections.length === 0 ? (
        <p className="py-20 text-center text-ink-soft">
          No collections yet — check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.slug}`}
              className="group border border-ink/15 p-8 transition-colors hover:border-ink"
            >
              <h2 className="font-serif text-2xl font-normal transition-colors group-hover:text-sepia">
                {c.name}
              </h2>
              {c.description && (
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {c.description}
                </p>
              )}
              <span className="link-underline mt-6 inline-block text-xs uppercase tracking-[0.18em] text-ink-soft group-hover:text-ink">
                Shop the collection
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
