// Perf probe used during the navigation/perf fix.
//
// 1. Creates a user via Prisma.
// 2. Signs in via /api/auth/callback/credentials.
// 3. Times each dashboard route via fetch.
//
// Run: node --import ./scripts/ts-paths.mjs --env-file=.env scripts/perf-baseline.mts
//
// Keep this script self-contained and clean — it's checked into the
// repo as a regression/measurement tool. No secrets printed; the
// printed password is intentionally a fixed test value.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
// @ts-expect-error virtual
register("./scripts/ts-paths.mjs", pathToFileURL("./"));

import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const { db } = await import("../lib/db.ts");
const { createUser } = await import("../lib/auth/users.ts");
const { getUserById } = await import("../lib/auth/users.ts");
const {
  listWorkspacesForUser,
  getWorkspaceCountsForOwner,
  getDashboardOverview,
} = await import("../lib/workspaces/service.ts");

const ts = Date.now();
const email = `perf-${ts}@example.com`;
const password = "perf-test-pass-12345";
const name = "Perf User";
let userId: string | undefined;

async function cleanup() {
  try {
    if (userId) await db.user.delete({ where: { id: userId } });
  } catch {
    // ignore
  }
}

try {
  const tCreateUser0 = performance.now();
  const user = await createUser({ email, name, password });
  userId = user.id;
  const tCreateUser1 = performance.now();
  console.log(`[setup] createUser: ${Math.round(tCreateUser1 - tCreateUser0)}ms`);

  // Sign in via real Auth.js endpoint.
  const jar = new Map<string, string>();
  function captureSetCookie(headers: Headers) {
    const set = (headers as unknown as { getSetCookie?: () => string[] })
      .getSetCookie?.() ?? [];
    for (const sc of set) {
      const [pair] = sc.split(";");
      const [n, ...rest] = pair.split("=");
      if (n) jar.set(n.trim(), rest.join("=").trim());
    }
  }
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  captureSetCookie(csrfRes.headers);
  const csrfBody = (await csrfRes.json()) as { csrfToken: string };
  const signinForm = new URLSearchParams({
    csrfToken: csrfBody.csrfToken,
    email,
    password,
    callbackUrl: "/dashboard",
    json: "true",
  });
  const tSignIn0 = performance.now();
  const signinRes = await fetch(
    "http://localhost:3000/api/auth/callback/credentials",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      body: signinForm.toString(),
      redirect: "manual",
    },
  );
  const tSignIn1 = performance.now();
  captureSetCookie(signinRes.headers);
  console.log(
    `[signin] POST credentials: ${Math.round(tSignIn1 - tSignIn0)}ms status=${signinRes.status}`,
  );

  const cookieHeader = [...jar.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  async function timed(label: string, path: string, init?: RequestInit) {
    const t0 = performance.now();
    const res = await fetch(`http://localhost:3000${path}`, {
      ...init,
      headers: { ...(init?.headers ?? {}), cookie: cookieHeader },
      redirect: "manual",
    });
    const t1 = performance.now();
    const ms = Math.round(t1 - t0);
    const loc = res.headers.get("location");
    console.log(
      `[${label}] ${(init?.method ?? "GET").padEnd(4)} ${path.padEnd(60)} ${res.status}  ${String(ms).padStart(6)}ms${loc ? `  -> ${loc}` : ""}`,
    );
    return res;
  }

  // ---- HTTP timing ----
  console.log("\n--- HTTP route timings (signed in) ---");
  await timed("dashboard-warm", "/dashboard");
  await timed("dashboard-warm", "/dashboard");
  await timed("dashboard-warm", "/dashboard");
  await timed("new-ws", "/dashboard/workspaces/new");
  await timed("dashboard-after", "/dashboard");

  // ---- Raw DB timings ----
  console.log("\n--- Raw DB cost of the queries inside the dashboard render ---");

  // The two patterns the dashboard can use now.
  // Pattern A (old): Promise.all([listWorkspaces, getWorkspaceCountsForOwner])
  const a0 = performance.now();
  const [aList] = await Promise.all([
    listWorkspacesForUser(user.id),
    getWorkspaceCountsForOwner(user.id),
  ]);
  const a1 = performance.now();
  console.log(
    `[db dashboard patternA] parallel(listWorkspaces, getWorkspaceCountsForOwner): ${Math.round(a1 - a0)}ms (${aList.length} ws)`,
  );

  // Pattern B (new): workspaces then getDashboardOverview(workspaces) — one
  // fewer Workspace table query.
  const b0 = performance.now();
  const bList = await listWorkspacesForUser(user.id);
  await getDashboardOverview(user.id, bList);
  const b1 = performance.now();
  console.log(
    `[db dashboard patternB] sequential(listWorkspaces -> getDashboardOverview): ${Math.round(b1 - b0)}ms (${bList.length} ws)`,
  );

  // User-lookup duplication: simulates the layout + page double-requireUser.
  console.log("\n--- User-lookup duplication (the suspected bottleneck) ---");
  for (let i = 0; i < 3; i++) {
    const u0 = performance.now();
    const a = await getUserById(user.id);
    const b = await getUserById(user.id);
    const u1 = performance.now();
    console.log(
      `[user-lookup x2 #${i}] ${Math.round(u1 - u0)}ms (a=${a?.email === user.email ? "ok" : "missing"}, b=${b?.email === user.email ? "ok" : "missing"})`,
    );
  }

  // Full simulated dashboard render's DB cost: 2x user + workspaces + counts.
  const full0 = performance.now();
  await Promise.all([
    getUserById(user.id),
    getUserById(user.id),
    listWorkspacesForUser(user.id),
    getWorkspaceCountsForOwner(user.id),
  ]);
  const full1 = performance.now();
  console.log(
    `[db dashboard] full parallel(user x2 + listWorkspaces + getCounts): ${Math.round(full1 - full0)}ms`,
  );
} catch (e) {
  console.error("probe error:", e instanceof Error ? e.stack ?? e.message : String(e));
} finally {
  await cleanup();
  await db.$disconnect();
}