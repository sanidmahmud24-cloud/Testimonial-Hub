// Per-render HTTP timing probe focused on the dashboard.
//
// 1. Sign in via /api/auth (real Auth.js).
// 2. Hit /dashboard N times. Print median/min/max + each individual ms.
// 3. Then hit /dashboard/workspaces/new and the dashboard again.
//
// Run: node --import ./scripts/ts-paths.mjs --env-file=.env scripts/perf-http.mts

import { register } from "node:module";
import { pathToFileURL } from "node:url";
// @ts-expect-error virtual
register("./scripts/ts-paths.mjs", pathToFileURL("./"));

import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const { db } = await import("../lib/db.ts");
const { createUser } = await import("../lib/auth/users.ts");

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

function median(ns: number[]) {
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  if (s.length === 0) return 0;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function report(label: string, ms: number[]) {
  if (ms.length === 0) return;
  const min = Math.min(...ms);
  const max = Math.max(...ms);
  const med = median(ms);
  const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
  console.log(
    `${label.padEnd(18)}  n=${ms.length}  min=${min}ms  med=${Math.round(med)}ms  avg=${Math.round(avg)}ms  max=${max}ms`,
  );
}

try {
  const user = await createUser({ email, name, password });
  userId = user.id;

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
  const cookieHeader = () =>
    [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  const signinRes = await fetch(
    "http://localhost:3000/api/auth/callback/credentials",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: cookieHeader(),
      },
      body: new URLSearchParams({
        csrfToken: csrfBody.csrfToken,
        email,
        password,
        callbackUrl: "/dashboard",
        json: "true",
      }).toString(),
      redirect: "manual",
    },
  );
  captureSetCookie(signinRes.headers);

  async function time(label: string, path: string) {
    const t0 = performance.now();
    const res = await fetch(`http://localhost:3000${path}`, {
      headers: { cookie: cookieHeader() },
      redirect: "manual",
    });
    const t1 = performance.now();
    return { label, path, status: res.status, ms: Math.round(t1 - t0) };
  }

  // Warm up turbopack/cache 2x
  await time("warm", "/dashboard");
  await time("warm", "/dashboard");

  const N = 8;
  const dash: number[] = [];
  for (let i = 0; i < N; i++) {
    const r = await time("dash", "/dashboard");
    dash.push(r.ms);
  }
  report("/dashboard", dash);

  const newWs: number[] = [];
  for (let i = 0; i < 4; i++) {
    const r = await time("new", "/dashboard/workspaces/new");
    newWs.push(r.ms);
  }
  report("/dashboard/workspaces/new", newWs);

  const dash2: number[] = [];
  for (let i = 0; i < 4; i++) {
    const r = await time("dash2", "/dashboard");
    dash2.push(r.ms);
  }
  report("/dashboard (return)", dash2);
} catch (e) {
  console.error("probe error:", e instanceof Error ? e.message : String(e));
} finally {
  await cleanup();
  await db.$disconnect();
}