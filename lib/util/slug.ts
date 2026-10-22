// Convert a free-text workspace name into a URL-safe slug suggestion.
// Pure function, no DB. Used on the client to prefill the slug field.
export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 32);
}