// Server-only. Per-IP rate-limit window for the collection form.
// See SRS Appendix C.3 and D.3 (rate-limit test cases).

import "server-only";
import { db } from "@/lib/db";

/** Maximum number of submission tokens per ipHash inside the window. */
export const RATE_LIMIT_MAX = 5;

/** Window length in milliseconds (60 minutes). */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export class RateLimitedError extends Error {
  constructor() {
    super("Too many submissions. Please try again later.");
    this.name = "RateLimitedError";
  }
}

/**
 * Returns whether a new token may be minted for this ipHash right now.
 * Atomic in production (a single conditional count query); the mocked
 * store in tests provides the same semantics.
 */
export async function checkRateLimit(
  ipHash: string,
  now: Date = new Date(),
): Promise<{ allowed: boolean; count: number }> {
  if (!ipHash) return { allowed: true, count: 0 };
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
  const count = await db.submissionToken.count({
    where: { ipHash, createdAt: { gte: windowStart } },
  });
  return { allowed: count < RATE_LIMIT_MAX, count };
}

/**
 * Throws RateLimitedError if the limit is exceeded. The caller is
 * expected to call this on every form render and every submit attempt.
 */
export async function enforceRateLimit(
  ipHash: string,
  now: Date = new Date(),
): Promise<void> {
  const { allowed } = await checkRateLimit(ipHash, now);
  if (!allowed) throw new RateLimitedError();
}
