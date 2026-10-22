// Branded thank-you page shown after a successful submission.
// SRS-FR-06/07, Appendix A.3: confirms receipt, does not promise a
// publish date, and applies the workspace's theme color.
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorkspaceBySlug } from "@/lib/workspaces/service";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return { title: "Thank you" };
  return {
    title: `Thank you — ${workspace.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function ThanksPage({ params }: { params: Params }) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  // We read headers to make this a fully dynamic server component and
  // to ensure no caching layer can serve a stale workspace.
  await headers();

  return (
    <main
      className="flex flex-1 items-center justify-center px-4 py-12"
      style={
        workspace.themeColor
          ? ({ "--workspace-theme-color": workspace.themeColor } as React.CSSProperties)
          : undefined
      }
    >
      <div className="w-full max-w-xl space-y-6 text-center">
        {workspace.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={workspace.logoUrl}
            alt={workspace.name}
            className="mx-auto h-12 w-auto"
          />
        ) : null}
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white"
          style={
            workspace.themeColor
              ? { backgroundColor: workspace.themeColor }
              : { backgroundColor: "var(--primary)" }
          }
          aria-hidden="true"
        >
          ✓
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Thank you for your testimonial!
        </h1>
        <p className="text-sm text-muted-foreground">
          Your submission for <strong>{workspace.name}</strong> has been
          received. The workspace owner will review it before it&apos;s
          published to the public wall.
        </p>
        <p className="text-xs text-muted-foreground">
          You can safely close this tab.
        </p>
      </div>
    </main>
  );
}
