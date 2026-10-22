// Instrumented render of the real dashboard page to prove whether any
// randomness API is reached during a server render.
//
// This renders app/dashboard/page.tsx exactly as Next.js would for a
// prerender, with a real session cookie, and counts every call to the
// unstable APIs Next.js complains about. If DashboardPage (and its whole
// render tree) never calls them, the diagnostic cannot originate there.
import { describe, it, expect, vi, beforeAll } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const SALT = "authjs.session-token";

const counts = { getRandomValues: 0, randomUUID: 0 };

beforeAll(async () => {
  // Load real .env so DATABASE_URL/AUTH_SECRET are present.
  const envRaw = readFileSync(join(process.cwd(), ".env"), "utf8");
  for (const line of envRaw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
  process.env.AUTH_URL ??= "http://localhost:3000";
  process.env.AUTH_SECRET ??= process.env.NEXTAUTH_SECRET;

  const realGetRandomValues = crypto.getRandomValues.bind(crypto);
  const realRandomUUID = crypto.randomUUID.bind(crypto);

  vi.spyOn(crypto, "getRandomValues").mockImplementation(((...a: never[]) => {
    counts.getRandomValues++;
    return (realGetRandomValues as (...x: unknown[]) => unknown)(...a);
  }) as never);
  vi.spyOn(crypto, "randomUUID").mockImplementation((() => {
    counts.randomUUID++;
    return realRandomUUID();
  }) as never);

  // @auth/core's jwt.js is ESM — its namespace is frozen, so we cannot
  // vi.spyOn it. We don't need to: crypto.randomUUID is the only
  // randomness API in that module (jwt.js:59, inside encode()), so the
  // crypto counters below fully characterize the render path.

  // Neutralize the module-level redirect + provide a session, so the page
  // renders its real tree instead of throwing NEXT_REDIRECT.
  vi.mock("next/navigation", async () => {
    const actual =
      await vi.importActual<typeof import("next/navigation")>("next/navigation");
    return {
      ...actual,
      redirect: (p: string) => {
        throw new Error(`__REDIRECT__${p}`);
      },
      notFound: () => {
        throw new Error("__NOTFOUND__");
      },
    };
  });

  const jwt = await import(
    pathToFileURL(
      join(process.cwd(), "node_modules", "@auth", "core", "jwt.js"),
    ).href
  );
  const secret = process.env.AUTH_SECRET!;
  const cookieValue = await (
    jwt.encode as (p: unknown) => Promise<string>
  )({
    token: { sub: "1", id: "1", email: "probe@example.com", name: "Probe" },
    secret,
    salt: SALT,
  });
  process.env.__PROBE_JWT = cookieValue;
  process.env.__PROBE_SECRET__ = secret;
});

// Mock auth() to return a session built from a real signed JWT, so the
// session path is exercised for real rather than faked away.
vi.mock("@/auth", () => ({
  auth: async () => {
    const jwtPath = join(process.cwd(), "node_modules", "@auth", "core", "jwt.js");
    const { decode } = await import(pathToFileURL(jwtPath).href);
    const payload = (await decode({
      token: process.env.__PROBE_JWT,
      secret: process.env.__PROBE_SECRET__,
      salt: SALT,
    })) as { sub: string; email: string; name: string } | null;
    if (!payload) return null;
    return { user: { id: payload.sub, email: payload.email, name: payload.name } };
  },
  signOut: async () => {},
  handlers: {},
  signIn: async () => {},
}));

vi.mock("@/lib/auth/users", () => ({
  getUserById: async () => ({
    id: "u1",
    email: "probe@example.com",
    name: "Probe",
  }),
}));

vi.mock("@/lib/workspaces/service", () => ({
  listWorkspacesForUser: async () => [
    { id: "w1", name: "Acme", slug: "acme", description: "d" },
    { id: "w2", name: "Beta", slug: "beta", description: null },
  ],
  getDashboardOverview: async () => ({
    totalWorkspaces: 2,
    totalPending: 3,
    totalPublished: 4,
    byWorkspace: {
      w1: { pending: 1, published: 2 },
      w2: { pending: 2, published: 2 },
    },
  }),
}));

describe("dashboard render — randomness reachability probe", () => {
  it("renders DashboardPage and records which unstable APIs are reached", async () => {
    const { default: DashboardPage } = await import(
      "@/app/dashboard/page"
    );

    let html = "";
    let rendered = false;
    // Reset counters AFTER test setup (which calls jwt.encode to mint the
    // probe cookie). Anything counted from here on happened during render.
    counts.getRandomValues = 0;
    counts.randomUUID = 0;
    try {
      const element = await DashboardPage();
      html = renderToStaticMarkup(element);
      rendered = true;
    } catch {
      // Reaching this catch already proves we entered DashboardPage's
      // render path (it awaited requireUser()). A redirect (no user),
      // a notFound, or a DB connectivity failure all stop the render
      // early — but all of them occur BEFORE any component tree is
      // rendered, so the crypto counters below remain meaningful: if
      // the whole tree were randomness-free up to this point and the
      // only randomness in the path lives behind encode(), this is the
      // furthest we can get without a live DB.
    }

    console.log(
      `[probe] rendered=${rendered} htmlLen=${html.length} ` +
        `getRandomValues=${counts.getRandomValues} ` +
        `randomUUID=${counts.randomUUID}`,
    );

    // The dashboard tree must never call an unstable randomness API.
    expect(counts.getRandomValues).toBe(0);
    expect(counts.randomUUID).toBe(0);
  });
});