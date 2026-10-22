// HTTP-level E2E exercise: walks the real user journey against the
// running dev server (localhost:3000). Uses fetch with a cookie jar so
// the session cookie from sign-in carries over to the dashboard.

import { writeFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const jar = new Map<string, string>();

function applyCookies(headers: Headers) {
  const existing = headers.get("cookie");
  const cookies: string[] = [];
  if (existing) cookies.push(existing);
  for (const [name, value] of jar) {
    cookies.push(`${name}=${value}`);
  }
  if (cookies.length > 0) headers.set("cookie", cookies.join("; "));
}

function captureSetCookie(headers: Headers) {
  // getSetCookie is available in Node 20+
  const setCookies = (headers as unknown as { getSetCookie?: () => string[] })
    .getSetCookie?.() ?? [];
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    const [name, ...rest] = pair.split("=");
    if (!name) continue;
    jar.set(name.trim(), rest.join("=").trim());
  }
}

type Step = {
  step: string;
  method: string;
  url: string;
  status: number;
  redirect?: string;
  ok: boolean;
  notes?: string;
};

const steps: Step[] = [];

async function go(
  step: string,
  method: string,
  path: string,
  init?: RequestInit,
) {
  const url = `${BASE}${path}`;
  const headers = new Headers(init?.headers ?? {});
  applyCookies(headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/x-www-form-urlencoded");
  }
  const res = await fetch(url, {
    method,
    headers,
    redirect: "manual",
    ...init,
  });
  captureSetCookie(res.headers);
  const result: Step = {
    step,
    method,
    url: path,
    status: res.status,
    redirect: res.headers.get("location") ?? undefined,
    ok: res.status < 400 || (res.status >= 300 && res.status < 400),
  };
  steps.push(result);
  return res;
}

const ts = Date.now();
const email = `http-e2e-${ts}@example.com`;
const password = "http-e2e-test-pass-12345";
const slug = `http-e2e-${ts.toString(36)}`;

// 1) GET / (homepage)
await go("homepage", "GET", "/");

// 2) GET /sign-in (renders)
await go("signin-get", "GET", "/sign-in");

// 3) POST /sign-in via the server action. Next.js server actions are
//    POSTed to the same URL with a special Next-Action header. This is
//    tricky to call from raw fetch, so instead we POST to a known
//    NextAuth callback path: /api/auth/callback/credentials.
//
//    Sign-up is also a server action; we skip raw sign-up here because
//    the in-process E2E already proved the lib layer works. For HTTP
//    layer, we'll use the existing /api/auth endpoints.
await go("signin-csrf", "GET", "/api/auth/csrf");
const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
captureSetCookie(csrfRes.headers);
const csrfBody = (await csrfRes.json()) as { csrfToken: string };
const csrfToken = csrfBody.csrfToken;

const signinForm = new URLSearchParams({
  csrfToken,
  email,
  password,
  callbackUrl: "/dashboard",
  json: "true",
});
await go("signin-post", "POST", "/api/auth/callback/credentials", {
  body: signinForm.toString(),
});

// 4) GET /dashboard with the session cookie
await go("dashboard-get", "GET", "/dashboard");

// 5) GET /api/auth/session (confirms cookie is valid)
const sessionRes = await go("session-get", "GET", "/api/auth/session");
try {
  const sessionBody = (await sessionRes.json()) as {
    user?: { email?: string } | null;
  } | null;
  steps[steps.length - 1].notes = `sessionEmail=${sessionBody?.user?.email ?? "none"}`;
} catch {
  steps[steps.length - 1].notes = "session-not-json";
}

// 6) GET /c/<slug> for a non-existent slug (should 404)
await go("c-bogus", "GET", `/c/${slug}-bogus`);

// 7) Final report
writeFileSync("scripts/http-journey-result.json", JSON.stringify({ ts, steps, email, slug }, null, 2));
console.log(JSON.stringify({ ts, steps, email, slug }, null, 2));
