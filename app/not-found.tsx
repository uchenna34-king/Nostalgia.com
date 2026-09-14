import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-x flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">Lost in the archive</p>
      <h1 className="mt-3 font-serif text-7xl font-normal">404</h1>
      <p className="mt-4 max-w-sm text-ink-soft">
        This page has faded from memory. Let&apos;s get you back to the
        collection.
      </p>
      <Link href="/" className="btn-primary mt-8">
        Return home
      </Link>
    </main>
  );
}
