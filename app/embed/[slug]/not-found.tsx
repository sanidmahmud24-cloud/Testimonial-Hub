// 404 for /embed/[slug]. Same shape as the embed page but with a 404
// message. Rendered inside iframes on third-party sites; keep the chrome
// minimal.
export default function EmbedNotFound() {
  return (
    <div className="min-h-screen bg-background p-4 font-sans text-foreground">
      <div className="mx-auto max-w-sm space-y-2 text-center">
        <p className="text-sm font-medium">Workspace not found</p>
        <p className="text-xs text-muted-foreground">
          The embed&apos;s workspace may have been removed.
        </p>
      </div>
    </div>
  );
}
