import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorkspaceBySlug } from "@/lib/workspaces/service";
import { listEmbedTestimonials } from "@/lib/testimonials/public";

type Params = Promise<{ slug: string }>;

// Embed pages exist to be iframed into third-party sites. They should
// never appear in search results.
export const metadata: Metadata = {
  title: "Embed",
  robots: { index: false, follow: false },
};

/**
 * Iframe-only embed page. Renders a compact list of approved +
 * published testimonials for embedding on third-party sites.
 * No nav, no chrome, no submitter email. Designed to be loaded
 * inside <iframe src="/embed/<slug>">.
 */
export default async function EmbedPage({ params }: { params: Params }) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const testimonials = await listEmbedTestimonials(workspace.id, 20);

  return (
    <div
      className="min-h-screen bg-background p-4 font-sans text-foreground"
      style={
        workspace.themeColor
          ? ({ "--workspace-theme-color": workspace.themeColor } as React.CSSProperties)
          : undefined
      }
    >
      {testimonials.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No testimonials to display yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {testimonials.map((t) => (
            <li
              key={t.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              {t.rating ? (
                <div className="mb-1 flex gap-0.5 text-amber-500 text-xs">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
              ) : null}
              <p className="text-sm leading-relaxed">&ldquo;{t.content}&rdquo;</p>
              <p className="mt-2 text-xs font-medium">
                {t.submitterName}
                {t.company ? ` · ${t.company}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
