// Guards the auth invariants that the Cache Components refactor had to
// preserve. The session read was moved behind `use cache: private` and
// pushed behind <Suspense> boundaries to stop routes from blocking
// prerender. That must never weaken the auth gate.
//
// These tests assert the *shape* of the fix rather than runtime
// behavior, because `use cache: private` and `redirect()` are
// framework/runtime features that a bare vitest + happy-dom harness
// cannot execute. A silent regression here (dropping the directive,
// dropping the redirect, or caching sessions server-side) would be a
// security hole, so it is worth pinning down statically.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("auth/session — session read is request-scoped, never server-cached", () => {
  const src = read("lib/auth/session.ts");

  it('uses "use cache: private" so the session is cached in the browser only', () => {
    // A private scope reads cookies/headers but never stores the result
    // on the server, so one user's session can never be served to
    // another. A plain `use cache` here would be a data leak.
    expect(src).toMatch(/["']use cache: private["']/);
  });

  it("does NOT use a plain server-side `use cache` for the session", () => {
    const plainUseCache = src.match(/["']use cache["']/g) ?? [];
    expect(plainUseCache).toHaveLength(0);
  });

  it("does not use `use cache: remote`, which would persist sessions off-box", () => {
    expect(src).not.toMatch(/["']use cache: remote["']/);
  });

  it("still calls auth() so the session is verified on every read", () => {
    expect(src).toMatch(/await auth\(\)/);
  });

  it("still redirects to /sign-in when there is no user", () => {
    expect(src).toMatch(/if \(!user\) redirect\(\"\/sign-in\"\)/);
  });

  it("keeps the react.cache wrapper that de-duplicates the DB lookup per render", () => {
    expect(src).toMatch(/export const getCurrentUser = cache\(async \(\) => \{/);
  });
});

describe("auth/session — dashboard authorization is defense in depth", () => {
  // proxy.ts gates /dashboard, but each page/action must re-verify the
  // session itself. If a refactor ever removed these, middleware alone
  // would be the single point of failure for authorization.
  const guarded = [
    "app/dashboard/page.tsx",
    "app/dashboard/workspaces/[id]/page.tsx",
    "app/dashboard/workspaces/[id]/inbox/page.tsx",
    "app/dashboard/workspaces/actions.ts",
    "app/dashboard/workspaces/[id]/inbox/actions.ts",
    "app/dashboard/workspaces/[id]/inbox/tag-actions.ts",
  ];

  for (const file of guarded) {
    it(`${file} calls requireUser()`, () => {
      expect(read(file)).toMatch(/requireUser\(\)/);
    });
  }

  it("keeps the owner check on the workspace settings page", () => {
    const src = read("app/dashboard/workspaces/[id]/page.tsx");
    expect(src).toMatch(/workspace\.ownerId !== user\.id/);
  });

  it("keeps proxy.ts gating /dashboard via the authorized() callback", () => {
    expect(read("proxy.ts")).toMatch(/export default auth/);
    expect(read("auth.config.ts")).toMatch(
      /if \(isOnDashboard\) return isLoggedIn/,
    );
  });
});

describe("cache components — blocking reads sit behind Suspense", () => {
  it("dashboard layout no longer awaits the session at the top level", () => {
    const src = read("app/dashboard/layout.tsx");
    // The read must be inside a component behind <Suspense>, not in the
    // layout body — a top-level await holds {children} behind the request.
    expect(src).not.toMatch(
      /export default async function DashboardLayout[\s\S]*?const user = await requireUser\(\)/,
    );
    expect(src).toMatch(/<Suspense fallback=\{<AuthActionsSkeleton \/>\}>/);
  });

  it("dashboard layout still renders the sign-out control and email", () => {
    const src = read("app/dashboard/layout.tsx");
    expect(src).toMatch(/user\.email/);
    expect(src).toMatch(/signOutAction/);
  });

  it("homepage does not call connection() to opt out of prerendering", () => {
    const src = read("app/page.tsx");
    // connection() was the reported cause; the fix is a Suspense boundary
    // around the session read instead. Match an actual awaited call, not
    // the explanatory comment that mentions it.
    expect(src).not.toMatch(/await connection\(\)/);
    expect(src).not.toMatch(/from ["']next\/server["']/);
    expect(src).toMatch(/<Suspense/);
    expect(src).toMatch(/await auth\(\)/);
  });

  it("sign-in keeps the friendly error mapping behind Suspense", () => {
    const src = read("app/(auth)/sign-in/page.tsx");
    expect(src).toMatch(/<Suspense/);
    expect(src).toMatch(/await searchParams/);
    // The technical Auth.js error code must never reach the user.
    expect(src).toMatch(/Invalid email or password\. Please try again\./);
    expect(src).toMatch(/callbackUrl \|\| "\/dashboard"/);
  });

  it("public /c routes declare instant = false (documented blocking opt-out)", () => {
    expect(read("app/c/layout.tsx")).toMatch(
      /export const instant = false/,
    );
  });
});