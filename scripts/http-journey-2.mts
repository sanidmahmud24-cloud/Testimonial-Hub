// HTTP + DB combined E2E: creates a real user via the lib, then signs
// in via NextAuth's HTTP endpoints, then exercises the protected
// dashboard, the inbox route, and the public surfaces.

import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
// @ts-expect-error virtual
register("./scripts/ts-paths.mjs", pathToFileURL("./"));

const { db } = await import("../lib/db.ts");
const { createUser } = await import("../lib/auth/users.ts");
const { createWorkspace } = await import("../lib/workspaces/service.ts");

const BASE = "http://localhost:3000";
const jar = new Map<string, string>();

function applyCookies(headers: Headers) {
  const cookies: string[] = [];
  for (const [name, value] of jar) cookies.push(`${name}=${value}`);
  if (cookies.length > 0) headers.set("cookie", cookies.join("; "));
}
function captureSetCookie(headers: Headers) {
  const setCookies =
    (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
    [];
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    const [name, ...rest] = pair.split("=");
    if (!name) continue;
    jar.set(name.trim(), rest.join("=").trim());
  }
}

const ts = Date.now();
const email = `http-e2e-${ts}-${randomUUID().slice(0, 6)}@example.com`;
const password = "http-e2e-test-pass-12345";
const slug = `http-e2e-${ts.toString(36)}`;

const user = await createUser({ email, name: "HTTP E2E", password });
const workspace = await createWorkspace({
  ownerId: user.id,
  name: "HTTP E2E Workspace",
  slug,
  description: "Created by http-journey-2",
});

const log: Array<Record<string, unknown>> = [];

async function go(step: string, method: string, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  applyCookies(headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/x-www-form-urlencoded");
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, redirect: "manual", ...init });
  captureSetCookie(res.headers);
  log.push({
    step,
    method,
    path,
    status: res.status,
    location: res.headers.get("location"),
  });
  return res;
}

let ok = true;
let err: string | undefined;
try {
  // 1) CSRF
  const csrfRes = await go("csrf", "GET", "/api/auth/csrf");
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  // 2) Sign in
  const signin = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: "/dashboard",
    json: "true",
  });
  await go("signin", "POST", "/api/auth/callback/credentials", {
    body: signin.toString(),
  });

  // 3) Session
  const sessRes = await go("session", "GET", "/api/auth/session");
  const sess = (await sessRes.json()) as { user?: { email?: string } | null };
  log[log.length - 1].notes = `email=${sess?.user?.email ?? "none"}`;
  if (sess?.user?.email !== email) {
    ok = false;
    err = `session email mismatch: got ${sess?.user?.email ?? "none"}`;
  }

  // 4) Dashboard (should now succeed)
  const dashRes = await go("dashboard", "GET", "/dashboard");
  if (dashRes.status !== 200) {
    ok = false;
    err = `dashboard not 200: ${dashRes.status}`;
  }
  const dashBody = await dashRes.text();
  log[log.length - 1].notes = `containsWorkspace=${dashBody.includes(slug)}`;

  // 5) Inbox
  const inboxRes = await go("inbox", "GET", `/dashboard/workspaces/${workspace.id}/inbox`);
  if (inboxRes.status !== 200) {
    ok = false;
    err = `inbox not 200: ${inboxRes.status}`;
  }

  // 6) Public collection page (no auth)
  const collRes = await go("collection", "GET", `/c/${slug}`);
  if (collRes.status !== 200) {
    ok = false;
    err = `collection not 200: ${collRes.status}`;
  }
  const collBody = await collRes.text();
  log[log.length - 1].notes = `hasFormToken=${/name="token"/.test(collBody)}`;

  // 7) Wall (no testimonials yet, should show empty state)
  const wallRes = await go("wall", "GET", `/c/${slug}/wall`);
  if (wallRes.status !== 200 && wallRes.status !== 404) {
    ok = false;
    err = `wall unexpected status: ${wallRes.status}`;
  }
  const wallBody = await wallRes.text();
  log[log.length - 1].notes = `noTestimonials=${wallBody.includes("No published testimonials")}`;

  // 8) Embed
  const embedRes = await go("embed", "GET", `/embed/${slug}`);
  if (embedRes.status !== 200 && embedRes.status !== 404) {
    ok = false;
    err = `embed unexpected status: ${embedRes.status}`;
  }

  // 9) Cross-workspace authorization: try to access a non-existent
  //    workspace id (should notFound, not 500).
  await go("other-workspace", "GET", `/dashboard/workspaces/cm-nonexistent`);
} catch (e) {
  ok = false;
  err = e instanceof Error ? e.message : String(e);
} finally {
  // Cleanup
  try {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: user.id } });
  } catch {
    // ignore
  }
  await db.$disconnect();
  const out = { ts, email, slug, ok, err, log };
  writeFileSync("scripts/http-journey-2-result.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}
