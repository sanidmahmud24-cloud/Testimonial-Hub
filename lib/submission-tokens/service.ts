// Server-only. Mints, validates, and consumes SubmissionToken rows.
// See SRS Appendix B.1, C.1, D.3.

import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Token plaintext length in bytes (32 bytes -> 43-char base64url). */
const TOKEN_BYTES = 32;

/** 1-hour TTL. */
export const TOKEN_TTL_MS = 60 * 60 * 1000;

export class SubmissionTokenInvalidError extends Error {
  constructor() {
    super("This form has expired or has already been submitted. Please reload the page to submit a new testimonial.");
    this.name = "SubmissionTokenInvalidError";
  }
}

/** SHA-256 of a token plaintext, hex-encoded. Stored in tokenHash. */
export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** Hashes an IP with a per-workspace salt. Stored in ipHash. */
export function hashIp(ip: string, ipSalt: string): string {
  return createHash("sha256").update(`${ip}:${ipSalt}`).digest("hex");
}

export type MintResult = {
  plaintext: string;
  expiresAt: Date;
  id: string;
};

/**
 * Mint a fresh token for a workspace. Stores only the SHA-256 hash.
 * The plaintext is returned to the caller (the form renderer), who
 * embeds it in a hidden <input>.
 */
export async function mintSubmissionToken(args: {
  workspaceId: string;
  ipSalt: string;
  ip: string;
  userAgent: string | null;
  now?: Date;
}): Promise<MintResult> {
  const now = args.now ?? new Date();
  const plaintext = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(plaintext);
  const ipHash = hashIp(args.ip, args.ipSalt);
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
  const created = await db.submissionToken.create({
    data: {
      workspaceId: args.workspaceId,
      tokenHash,
      ipHash,
      userAgent: args.userAgent ? args.userAgent.slice(0, 512) : null,
      createdAt: now,
      expiresAt,
    },
  });
  return { plaintext, expiresAt: created.expiresAt, id: created.id };
}

/**
 * Result of a single-shot consume attempt. "ok: true" means the token
 * was found, unconsumed, unexpired, and is now consumed. The caller
 * is expected to write the Testimonial in the same transaction (so
 * that a Testimonial write failure rolls back the consume).
 */
export type ConsumeResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "expired" | "consumed" };

/**
 * Atomic single-shot check-and-set. Returns "consumed" or "expired" on
 * failure so the action layer can map to a single generic public error.
 * The caller MUST pass the result into the same Prisma transaction that
 * writes the Testimonial (or call this and then begin a new transaction
 * that immediately writes the row; the consume is irreversible).
 */
export async function consumeToken(
  tx: Prisma.TransactionClient,
  plaintext: string,
  now: Date = new Date(),
): Promise<ConsumeResult> {
  const tokenHash = hashToken(plaintext);
  // Fast path: check existence + expiry without a write.
  const existing = await tx.submissionToken.findUnique({
    where: { tokenHash },
  });
  if (!existing) return { ok: false, reason: "missing" };
  if (existing.consumedAt) return { ok: false, reason: "consumed" };
  if (existing.expiresAt.getTime() <= now.getTime())
    return { ok: false, reason: "expired" };

  // Atomic check-and-set: only one concurrent caller wins.
  const result = await tx.submissionToken.updateMany({
    where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
    data: { consumedAt: now },
  });
  if (result.count === 0) {
    // Lost the race or the row changed between the read and the update.
    return { ok: false, reason: "consumed" };
  }
  return { ok: true };
}
