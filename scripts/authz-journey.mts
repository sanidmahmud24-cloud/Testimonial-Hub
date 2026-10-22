// Authorization test: user A creates a workspace, user B signs in,
// and tries to access A's workspace via /dashboard/workspaces/<id>.
// Expected: notFound() (rendered as the global not-found body), and
// any moderation action attempted via the inbox must reject.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
// @ts-expect-error virtual
register("./scripts/ts-paths.mjs", pathToFileURL("./"));

const { db } = await import("../lib/db.ts");
const { createUser } = await import("../lib/auth/users.ts");
const { createWorkspace } = await import("../lib/workspaces/service.ts");
const {
  setTestimonialStatus,
  NotTestimonialOwnerError,
} = await import("../lib/testimonials/moderation.ts");

const ts = Date.now();
const userA = await createUser({
  email: `authz-a-${ts}@example.com`,
  name: "User A",
  password: "authz-a-pass-12345",
});
const userB = await createUser({
  email: `authz-b-${ts}@example.com`,
  name: "User B",
  password: "authz-b-pass-12345",
});
const ws = await createWorkspace({
  ownerId: userA.id,
  name: "A's Workspace",
  slug: `authz-a-${ts.toString(36)}`,
});

// A submits a testimonial into A's workspace (using lib directly).
const { mintSubmissionToken } = await import(
  "../lib/submission-tokens/service.ts"
);
const { submitTestimonial } = await import(
  "../lib/testimonials/service.ts"
);

const token = await mintSubmissionToken({
  workspaceId: ws.id,
  ipSalt: ws.ipSalt,
  ip: "127.0.0.1",
  userAgent: "authz-journey",
});
const fd = new FormData();
fd.set("submitterName", "Test Person");
fd.set("content", "Authz test content");
fd.set("rating", "5");
fd.set("consentGiven", "on");
fd.set("website", "");
fd.set("renderedAt", String(Date.now() - 3000));
fd.set("token", token.plaintext);
const { testimonialId } = await submitTestimonial({
  formData: fd,
  headers: new Headers({ origin: "http://localhost:3000" }),
  ip: "127.0.0.1",
});

const report: Record<string, unknown> = { ts, testimonialId };

// 1) B tries to approve A's testimonial — should throw NotTestimonialOwnerError.
try {
  await setTestimonialStatus(testimonialId, userB.id, "APPROVED");
  report.bApprove = "UNEXPECTED_OK";
} catch (e) {
  report.bApprove =
    e instanceof NotTestimonialOwnerError ? "REJECTED_OK" : "WRONG_ERROR";
  report.bApproveError = e instanceof Error ? e.constructor.name : "unknown";
}

// 2) Confirm row is still PENDING (B's attempt had no effect).
const after = await db.testimonial.findUnique({ where: { id: testimonialId } });
report.afterBAttempt = {
  status: after?.status,
  isPublished: after?.isPublished,
};

// 3) HTTP: B signs in, then visits A's workspace inbox.
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
async function go(method: string, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  applyCookies(headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/x-www-form-urlencoded");
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, redirect: "manual", ...init });
  captureSetCookie(res.headers);
  return res;
}

const csrfRes = await go("GET", "/api/auth/csrf");
const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
const body = new URLSearchParams({
  csrfToken,
  email: userB.email,
  password: "authz-b-pass-12345",
  callbackUrl: "/dashboard",
  json: "true",
});
await go("POST", "/api/auth/callback/credentials", { body: body.toString() });

const inboxAsB = await go(
  "GET",
  `/dashboard/workspaces/${ws.id}/inbox`,
);
const inboxBody = await inboxAsB.text();
report.bInboxStatus = inboxAsB.status;
report.bInboxHidesContent = !inboxBody.includes("Test Person");
report.bInboxShowsNotFound = inboxBody.includes("We couldn");

// 4) Cleanup
try {
  await db.workspace.delete({ where: { id: ws.id } });
  await db.user.delete({ where: { id: userA.id } });
  await db.user.delete({ where: { id: userB.id } });
} catch {
  // ignore
}
await db.$disconnect();
console.log(JSON.stringify(report, null, 2));
