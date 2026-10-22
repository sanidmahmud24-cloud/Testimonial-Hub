// 404 for /c/[slug]/wall/<anything>. Distinct from the global not-found
// because the wall has its own semantics ("no published testimonials yet"
// vs "no such workspace"); without this file, calling notFound() inside
// the wall page would still stream the global UI but return HTTP 200
// (the layout's response is locked-in before the page errors).
import Link from "next/link";

export default function WallNotFound() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          That wall doesn&apos;t exist
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The workspace may have been removed, or the link is mistyped.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
