// Server-only helpers for reading the current session/user.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserById } from "@/lib/auth/users";

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

/**
 * Read the currently signed-in user. Returns null if not signed in.
 *
 * Wrapped in `react.cache` so that within a single server render (and
 * any nested RSC subtrees that share its scope) all callers hit the
 * DB exactly once. The dashboard layout and page both call
 * `requireUser()` independently; without this wrapper each layout +
 * page pair issued two sequential `getUserById` round-trips to the
 * database (~290ms each against remote Postgres). With `cache`, the
 * second call resolves from the in-flight promise in ~0ms.
 *
 * The cache key is React's auto-derived from the function arguments
 * (none here, so a single slot per request), which is exactly the
 * scope we want.
 *
 * Cache Components note: `auth()` reads the session cookie, which is
 * request-time data and can never be baked into the prerendered static
 * shell. `use cache: private` is the scope designed for exactly this
 * case — it is allowed to read `cookies()`/`headers()` directly and
 * keeps the result in the browser cache only, never on the server. That
 * gives the session a cache lifetime (so the router can prefetch the
 * authenticated UI) without ever storing one user's session where
 * another could read it. Callers must still render this behind a
 * <Suspense> boundary.
 *
 * Security: the cached value is scoped per-session in the browser. We
 * deliberately do NOT use a plain `use cache` (server-side) scope here,
 * which would risk serving one user's session to another.
 */
export const getCurrentUser = cache(async () => {
  "use cache: private";

  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return getUserById(id);
});

/**
 * Server-component / server-action helper: redirect to /sign-in if no user.
 * Use at the top of any dashboard page or action that requires auth.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}