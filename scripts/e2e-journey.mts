// E2E exercise: drive the full user journey against the live DB.
// Creates a unique user, a workspace, mints a submission token, posts a
// testimonial, approves + publishes it, and verifies it shows on the
// public wall + embed. Prints a tiny JSON report, never secrets.
//
// IMPORTANT: This script performs real DB writes. It is not idempotent
// across runs (it creates a new user every time). Use a unique email
// per run to avoid colliding with prior data.

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
const {
  submitTestimonial,
  SubmissionRejectedError,
} = await import("../lib/testimonials/service.ts");
const {
  setTestimonialStatus,
  setTestimonialPublished,
} = await import("../lib/testimonials/moderation.ts");
const {
  listPublishedTestimonials,
  listEmbedTestimonials,
} = await import("../lib/testimonials/public.ts");

const ts = Date.now();
const email = `e2e-${ts}-${randomUUID().slice(0, 6)}@example.com`;
const name = `E2E User ${ts}`;
const password = "e2e-test-pass-12345";
const slug = `e2e-${ts.toString(36)}`;

const result: Record<string, unknown> = { ts, email, slug };

// Track created IDs so we can clean up even on early failure.
let createdUserId: string | undefined;
let createdWorkspaceId: string | undefined;
let createdTestimonialId: string | undefined;

async function cleanupBestEffort() {
  try {
    if (createdTestimonialId) {
      await db.testimonial
        .delete({ where: { id: createdTestimonialId } })
        .catch(() => {});
    }
    if (createdWorkspaceId) {
      await db.workspace
        .delete({ where: { id: createdWorkspaceId } })
        .catch(() => {});
    }
    if (createdUserId) {
      await db.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
  } catch {
    // ignore
  }
}

process.on("unhandledRejection", async () => {
  await cleanupBestEffort();
  await db.$disconnect();
});

try {
  // 1) Sign-up: create a user.
  const user = await createUser({ email, name, password });
  createdUserId = user.id;
  result.userId = user.id;
  result.userEmail = user.email;

  // 2) Create a workspace.
  const workspace = await createWorkspace({
    ownerId: user.id,
    name: "E2E Workspace",
    slug,
    description: "Created by scripts/e2e-journey.mts",
  });
  createdWorkspaceId = workspace.id;
  result.workspaceId = workspace.id;
  result.workspaceSlug = workspace.slug;

  // 3) Mint a submission token (the public collection page does this).
  const token = await mintSubmissionToken({
    workspaceId: workspace.id,
    ipSalt: workspace.ipSalt,
    ip: "127.0.0.1",
    userAgent: "e2e-journey/1.0",
  });
  result.tokenId = token.id;

  // 4) Build a FormData and submit. submitTestimonial checks Origin so we
  //    pass no origin (it accepts when NEXT_PUBLIC_APP_URL is unset in
  //    dev, per the verifyOrigin short-circuit).
  const formData = new FormData();
  formData.set("submitterName", "Ada Lovelace");
  formData.set("content", "This product changed how I work. Highly recommended.");
  formData.set("role", "Engineer");
  formData.set("company", "Analytical Engines Co");
  formData.set("email", "ada@example.com");
  formData.set("rating", "5");
  formData.set("consentGiven", "on");
  formData.set("website", "");
  formData.set("renderedAt", String(Date.now() - 5000)); // 5s ago, > MIN
  formData.set("token", token.plaintext);

  const submitResult = await submitTestimonial({
    formData,
    headers: new Headers({ origin: "http://localhost:3000" }),
    ip: "127.0.0.1",
  });
  createdTestimonialId = submitResult.testimonialId;
  result.testimonialId = submitResult.testimonialId;

  // 5) Confirm row is in PENDING.
  const pending = await db.testimonial.findUnique({
    where: { id: submitResult.testimonialId },
  });
  result.pendingStatus = pending?.status;
  result.pendingIsPublished = pending?.isPublished;

  // 6) Approve + publish.
  const approved = await setTestimonialStatus(
    submitResult.testimonialId,
    user.id,
    "APPROVED",
  );
  result.afterApproveStatus = approved.status;
  const published = await setTestimonialPublished(
    submitResult.testimonialId,
    user.id,
    true,
  );
  result.afterPublish = {
    status: published.status,
    isPublished: published.isPublished,
  };

  // 7) Public surfaces.
  const wall = await listPublishedTestimonials(workspace.id);
  const embed = await listEmbedTestimonials(workspace.id, 20);
  result.wallCount = wall.length;
  result.embedCount = embed.length;
  result.wallFirstName = wall[0]?.submitterName;
  result.embedFirstName = embed[0]?.submitterName;

  // 8) Cleanup: delete the testimonial, the workspace, the user. Use the
  //    same services to keep behavior consistent.
  await cleanupBestEffort();
  createdUserId = createdWorkspaceId = createdTestimonialId = undefined;
  result.cleanup = "ok";

  result.ok = true;
} catch (e) {
  result.ok = false;
  result.error = e instanceof Error ? e.message : String(e);
  if (e instanceof SubmissionRejectedError) {
    result.errorCode = e.code;
  }
  await cleanupBestEffort();
} finally {
  await db.$disconnect();
  // Print a single JSON line; do not leak the password.
  const safe = { ...result, password: undefined };
  console.log(JSON.stringify(safe, null, 2));
}
