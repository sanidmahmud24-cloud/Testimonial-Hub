// Server-only. Submit a testimonial end-to-end with transactional
// token consumption, rate-limiting, and a single Testimonial write.
// See SRS Appendix C.1, C.3, D.3.

import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  consumeToken,
  hashIp,
  hashToken,
} from "@/lib/submission-tokens/service";
import {
  enforceRateLimit,
  RateLimitedError,
} from "@/lib/submission-tokens/rate-limit";
import {
  InvalidTestimonialError,
  MAX_SUBMISSION_TIME_MS,
  MIN_SUBMISSION_TIME_MS,
  parseSubmissionFormData,
  type SubmissionParsed,
} from "@/lib/testimonials/validation";
import { getEnv } from "@/lib/env";

/** Generic public message for any submission failure. */
export const SUBMISSION_PUBLIC_ERROR =
  "Submission rejected; please try again.";

/** Thrown for any submission failure. Carries an internal code for logs. */
export class SubmissionRejectedError extends Error {
  readonly code:
    | "rate_limited"
    | "token_invalid"
    | "honeypot"
    | "too_fast"
    | "too_slow"
    | "bad_origin"
    | "validation_failed"
    | "server_error";
  constructor(code: SubmissionRejectedError["code"]) {
    super(SUBMISSION_PUBLIC_ERROR);
    this.name = "SubmissionRejectedError";
    this.code = code;
  }
}

/**
 * Verify the Origin/Referer against the configured APP_BASE_URL.
 * Returns a discriminated result; the action layer maps a "bad"
 * outcome to SubmissionRejectedError("bad_origin") and never returns
 * the specific cause to the client.
 */
export function verifyOrigin(
  headers: Headers,
  appBaseUrl: string,
): { ok: true } | { ok: false } {
  if (!appBaseUrl) return { ok: true }; // dev: not configured -> don't block
  const stripSlash = (s: string) => s.replace(/\/+$/, "");
  const expected = stripSlash(appBaseUrl).toLowerCase();
  const fromHeader = (raw: string | null): string | null => {
    if (!raw) return null;
    try {
      const u = new URL(raw);
      return stripSlash(u.origin).toLowerCase();
    } catch {
      return null;
    }
  };
  const origin = fromHeader(headers.get("origin"));
  if (origin) return { ok: origin === expected };
  const referer = fromHeader(headers.get("referer"));
  if (referer) return { ok: referer === expected };
  // Neither header present: reject. This is conservative; browsers
  // always send at least one of these for non-redirected form POSTs.
  return { ok: false };
}

/**
 * Submit a testimonial. Throws SubmissionRejectedError for any
 * user-facing failure. The caller is expected to catch and redirect
 * to /c/<slug>/thanks on success, or surface SUBMISSION_PUBLIC_ERROR.
 */
export async function submitTestimonial(args: {
  formData: FormData;
  headers: Headers;
  ip: string;
}): Promise<{ testimonialId: string; workspaceSlug: string }> {
  const { formData, headers, ip } = args;

  // 1) Origin/Referer check (cheap, do it first).
  const { NEXT_PUBLIC_APP_URL } = getEnv();
  const voResult = verifyOrigin(headers, NEXT_PUBLIC_APP_URL ?? "");
  if (!voResult.ok) {
    throw new SubmissionRejectedError("bad_origin");
  }

  // 2) Parse + validate form input (Zod).
  let parsed: SubmissionParsed;
  try {
    parsed = parseSubmissionFormData(formData);
  } catch (err) {
    if (err instanceof InvalidTestimonialError) {
      // Honeypot signal: non-empty website field is the most common cause.
      if (err.issues.some((i) => i.path[0] === "website")) {
        throw new SubmissionRejectedError("honeypot");
      }
      throw new SubmissionRejectedError("validation_failed");
    }
    throw err;
  }

  // 3) Minimum / maximum submission-time check.
  const elapsed = Date.now() - parsed.renderedAt;
  if (elapsed < MIN_SUBMISSION_TIME_MS) {
    throw new SubmissionRejectedError("too_fast");
  }
  if (elapsed > MAX_SUBMISSION_TIME_MS) {
    throw new SubmissionRejectedError("too_slow");
  }

  // 4) Look up the workspace + its ipSalt by the token (single source of
  //    truth for the relationship). We need the workspaceId to enforce
  //    the rate limit and to scope the token.
  const tokenHash = hashToken(parsed.token);
  const tokenRow = await db.submissionToken.findUnique({
    where: { tokenHash },
    include: { workspace: true },
  });
  if (!tokenRow) throw new SubmissionRejectedError("token_invalid");
  const workspace = tokenRow.workspace;
  if (!workspace) throw new SubmissionRejectedError("token_invalid");

  // 5) Per-IP rate limit. The ipHash we record is derived from the
  //    submitter's IP and the workspace's ipSalt, matching the value
  //    the form-render step stored when the token was minted. We
  //    recompute it here (no raw IP is ever persisted).
  const submitterIpHash = hashIp(ip, workspace.ipSalt);
  try {
    await enforceRateLimit(submitterIpHash);
  } catch (err) {
    if (err instanceof RateLimitedError) {
      throw new SubmissionRejectedError("rate_limited");
    }
    throw err;
  }

  // 6) Atomic token consume + Testimonial write in a single transaction.
  try {
    const testimonialId = await db.$transaction(async (tx) => {
      const consume = await consumeToken(tx as Prisma.TransactionClient, parsed.token);
      if (!consume.ok) throw new SubmissionRejectedError("token_invalid");
      const created = await tx.testimonial.create({
        data: {
          workspaceId: workspace.id,
          submitterName: parsed.submitterName,
          content: parsed.content,
          role: parsed.role ?? null,
          company: parsed.company ?? null,
          email: parsed.email ?? null,
          rating: parsed.rating ?? null,
          consentGiven: true,
          status: "PENDING",
        },
      });
      return created.id;
    });
    return { testimonialId, workspaceSlug: workspace.slug };
  } catch (err) {
    if (err instanceof SubmissionRejectedError) throw err;
    throw new SubmissionRejectedError("server_error");
  }
}
