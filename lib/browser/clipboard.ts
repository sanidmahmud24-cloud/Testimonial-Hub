// Shared clipboard helper for "copy this link" buttons.
//
// The same copy-with-fallback logic was duplicated in two client
// components (the public wall and the dashboard workspace page). It lives
// here instead so the two surfaces cannot drift apart.
//
// Behaviour preserved exactly from the original inline versions:
//   - Prefer the modern asynchronous Clipboard API when available.
//   - Otherwise fall back to a hidden <textarea> + document.execCommand
//     ("copy"), removing the textarea afterwards.
//   - Any failure (insecure context, blocked permission, missing API) is
//     swallowed and reported as `false` so the caller can decide to do
//     nothing — the user can still select and copy the URL manually.
//
// This module performs NO browser work at module scope; `navigator` and
// `document` are only touched inside copyText(), which is called from a
// click handler. If it is ever invoked outside a browser (e.g. a stray
// server render), the typeof guards make it a safe no-op rather than a
// crash.

/**
 * Copy `text` to the user's clipboard.
 *
 * @returns `true` when the text was handed to the clipboard (via the async
 * Clipboard API or the execCommand fallback), `false` when no copy happened
 * or the attempt failed. Never throws.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    // Modern Clipboard API. Guarded so a missing `navigator` (server) or a
    // non-secure context simply falls through to the legacy path.
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Legacy fallback: a temporary, visually-hidden textarea whose selected
    // contents are copied synchronously. Rare (older browsers / denied
    // clipboard permission).
    if (
      typeof document === "undefined" ||
      typeof document.execCommand !== "function"
    ) {
      return false;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    try {
      ta.select();
      return document.execCommand("copy");
    } finally {
      // Always clean up the scratch node, even if select/execCommand threw.
      document.body.removeChild(ta);
    }
  } catch {
    // Silent by design — see the module comment.
    return false;
  }
}