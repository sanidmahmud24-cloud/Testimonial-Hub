// Minimal public layout for the collection page segment (/c/<slug>).
// Inherits the root <html>/<body> from app/layout.tsx but adds no
// dashboard chrome and no marketing navigation.
//
// `instant = false` (Cache Components): these public routes are keyed by
// the dynamic `slug` param and, on the wall, additionally read
// request `headers()` to build an absolute canonical URL for the share
// buttons. Both are genuine request-time data, so the route must render
// per request rather than prerender a static shell. This is the
// documented `[block]` opt-out: it changes nothing about the rendered
// output or the data access, it only tells Next.js a blocking render is
// intended here. A `loading.tsx` already provides the streaming UI.
export const instant = false;

export default function CollectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-full flex flex-col">{children}</div>;
}