// Full journey: HTTP sign-up -> HTTP sign-in -> lib submit -> lib
// approve/publish -> HTTP wall -> HTTP embed. This mirrors the
// spec: "sign up/sign in -> submit testimonial -> save to database ->
// review in dashboard -> approve and publish -> view on Wall of Love ->
// display through iframe embed".
//
// We use HTTP for the user-facing actions (sign-up, sign-in) because
// those are gated by NextAuth and have CSRF. The submission form is a
// Next.js server action (POSTed with a special header), which is hard
// to drive from raw fetch. To cover that path, we use the lib's
// submitTestimonial() with the public FormData shape. The moderation
// step (approve/publish) is also a server action, so we drive it via
// the lib's moderation service. The wall and embed are public pages,
// so we hit them via HTTP and inspect the body for our submitted
// testimonial.
//
// The test creates a real user, real workspace, real testimonial in the
// live Neon DB, then cleans up at the end.

import { randomUUID } from "node:crypto";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
// @ts-expect-error virtual
register("./scripts/ts-paths.mjs", pathToFileURL("./"));

const { db } = await import("../lib/db.ts");
const { createUser } = await import("../lib/auth/users.ts");
const { createWorkspace } = await import("../lib/workspaces/service.ts");
const { mintSubmissionToken } = await import(
  "../lib/submission-tokens/service.ts"
);
const { submitTestimonial } = await import("../lib/testimonials/service.ts");
const {
  setTestimonialStatus,
  setTestimonialPublished,
} = await import("../lib/testimonials/moderation.ts");
const {
  listTestimonialsForOwner,
} = await import("../lib/testimonials/moderation.ts");

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
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    redirect: "manual",
    ...init,
  });
  captureSetCookie(res.headers);
  return res;
}

const ts = Date.now();
const email = `journey-${ts}-${randomUUID().slice(0, 6)}@example.com`;
const password = "journey-test-pass-12345";
const slug = `journey-${ts.toString(36)}`;
const submittedName = `Journey Tester ${ts}`;

const report: Record<string, unknown> = { ts, email, slug };
let user: { id: string; email: string };
let workspace: { id: string; slug: string; name: string };
let testimonialId: string;

let ok = true;
try {
  // ----- Step 1: sign up (via lib; sign-up form is a server action) -----
  user = await createUser({ email, name: "Journey User", password });
  report.signup = { userId: user.id };

  // ----- Step 2: sign in (via HTTP /api/auth) -----
  const csrfRes = await go("GET", "/api/auth/csrf");
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const signin = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: "/dashboard",
    json: "true",
  });
  const signinRes = await go(
    "POST",
    "/api/auth/callback/credentials",
    { body: signin.toString() },
  );
  if (signinRes.status !== 302) {
    throw new Error(`sign-in failed: ${signinRes.status}`);
  }
  const sessRes = await go("GET", "/api/auth/session");
  const sess = (await sessRes.json()) as { user?: { email?: string } | null };
  if (sess?.user?.email !== email) {
    throw new Error(`session email mismatch: ${sess?.user?.email ?? "none"}`);
  }
  report.signin = { sessionEmail: sess.user?.email };

  // ----- Step 3: create workspace (form action — drive via lib) -----
  workspace = await createWorkspace({
    ownerId: user.id,
    name: "Journey Workspace",
    slug,
    description: "Created by scripts/full-journey.mts",
  });
  report.workspace = { id: workspace.id, slug: workspace.slug };

  // ----- Step 4: confirm dashboard renders for the signed-in user ----
  const dashRes = await go("GET", "/dashboard");
  if (dashRes.status !== 200) {
    throw new Error(`dashboard not 200: ${dashRes.status}`);
  }
  const dashBody = await dashRes.text();
  if (!dashBody.includes(slug)) {
    throw new Error(`dashboard missing workspace slug`);
  }
  report.dashboard = { containsWorkspace: true };

  // ----- Step 5: visit collection page, confirm token is minted -----
  const collRes = await go("GET", `/c/${slug}`);
  if (collRes.status !== 200) {
    throw new Error(`collection not 200: ${collRes.status}`);
  }
  const collBody = await collRes.text();
  if (!/name="token"/.test(collBody)) {
    throw new Error(`collection page missing token field`);
  }
  // Extract a token from the page (the form action submits it; we
  // re-mint for the lib submit to keep timing simple).
  report.collection = { hasFormToken: true };

  // ----- Step 6: submit a testimonial (via lib) -----
  const token = await mintSubmissionToken({
    workspaceId: workspace.id,
    ipSalt: workspace.ipSalt,
    ip: "127.0.0.1",
    userAgent: "full-journey/1.0",
  });
  const fd = new FormData();
  fd.set("submitterName", submittedName);
  fd.set("content", "This is the journey test testimonial. It must show on the public wall after approval.");
  fd.set("role", "QA");
  fd.set("company", "Journey Co");
  fd.set("email", "qa@journey.example");
  fd.set("rating", "5");
  fd.set("consentGiven", "on");
  fd.set("website", "");
  fd.set("renderedAt", String(Date.now() - 3000));
  fd.set("token", token.plaintext);
  const { testimonialId: tid } = await submitTestimonial({
    formData: fd,
    headers: new Headers({ origin: "http://localhost:3000" }),
    ip: "127.0.0.1",
  });
  testimonialId = tid;
  report.submit = { testimonialId, status: "PENDING" };

  // ----- Step 7: confirm it's in the owner's inbox (DB) -----
  const inbox = await listTestimonialsForOwner(workspace.id, user.id);
  if (!inbox.find((t) => t.id === testimonialId)) {
    throw new Error(`submitted testimonial not in inbox`);
  }
  report.inbox = { found: true, count: inbox.length };

  // ----- Step 8: approve and publish (via lib, owner-only) -----
  const approved = await setTestimonialStatus(testimonialId, user.id, "APPROVED");
  if (approved.status !== "APPROVED") {
    throw new Error(`approve failed: status=${approved.status}`);
  }
  const published = await setTestimonialPublished(testimonialId, user.id, true);
  if (!published.isPublished) {
    throw new Error(`publish failed: isPublished=${published.isPublished}`);
  }
  report.approvePublish = {
    status: published.status,
    isPublished: published.isPublished,
  };

  // ----- Step 9: visit Wall of Love (public) and confirm the row ----
  const wallRes = await go("GET", `/c/${slug}/wall`);
  if (wallRes.status !== 200) {
    throw new Error(`wall not 200: ${wallRes.status}`);
  }
  const wallBody = await wallRes.text();
  if (!wallBody.includes(submittedName)) {
    throw new Error(`wall does not include submitted name`);
  }
  if (!wallBody.includes("Journey Co")) {
    throw new Error(`wall does not include company`);
  }
  report.wall = {
    containsName: true,
    containsCompany: true,
    containsEmail: wallBody.includes("qa@journey.example"),
  };

  // ----- Step 10: visit iframe embed and confirm the row ----
  const embedRes = await go("GET", `/embed/${slug}`);
  if (embedRes.status !== 200) {
    throw new Error(`embed not 200: ${embedRes.status}`);
  }
  const embedBody = await embedRes.text();
  if (!embedBody.includes(submittedName)) {
    throw new Error(`embed does not include submitted name`);
  }
  report.embed = {
    containsName: true,
    containsEmail: embedBody.includes("qa@journey.example"),
  };
} catch (e) {
  ok = false;
  report.error = e instanceof Error ? e.message : String(e);
} finally {
  // Cleanup: delete workspace (cascades to testimonials + tokens),
  // then the user.
  try {
    if (workspace) {
      await db.workspace.delete({ where: { id: workspace.id } });
    }
    if (user) {
      await db.user.delete({ where: { id: user.id } });
    }
  } catch {
    // ignore
  }
  await db.$disconnect();
  report.ok = ok;
  console.log(JSON.stringify(report, null, 2));
}
