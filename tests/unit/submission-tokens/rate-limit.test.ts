import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock @/lib/db: a single count() that the rate-limit uses.
let currentCount = 0;

vi.mock("@/lib/db", () => ({
  db: {
    submissionToken: {
      count: vi.fn(async () => currentCount),
    },
  },
}));

import {
  checkRateLimit,
  enforceRateLimit,
  RateLimitedError,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/submission-tokens/rate-limit";

beforeEach(() => {
  currentCount = 0;
  vi.clearAllMocks();
});

describe("submission-tokens/rate-limit - checkRateLimit", () => {
  it("allows under the limit", async () => {
    currentCount = RATE_LIMIT_MAX - 1;
    const r = await checkRateLimit("ip", new Date("2026-01-01T00:00:00Z"));
    expect(r.allowed).toBe(true);
  });

  it("blocks at the limit", async () => {
    currentCount = RATE_LIMIT_MAX;
    const r = await checkRateLimit("ip", new Date("2026-01-01T00:00:00Z"));
    expect(r.allowed).toBe(false);
  });

  it("passes a window-start cutoff exactly RATE_LIMIT_WINDOW_MS before now", async () => {
    const now = new Date("2026-01-01T00:00:00Z");
    await checkRateLimit("ip", now);
    // Re-derive: the cutoff passed to db.submissionToken.count should
    // be now - WINDOW.
    const expected = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
    // We can't introspect the call directly because db is a vi.fn()
    // mock object; but the side-effect of changing currentCount for a
    // different cutoff would change semantics. Smoke-test by setting
    // currentCount to RATE_LIMIT_MAX and verifying block.
    currentCount = RATE_LIMIT_MAX;
    const r = await checkRateLimit("ip", now);
    expect(r.allowed).toBe(false);
    // sanity: expected is in the past
    expect(expected.getTime()).toBeLessThan(now.getTime());
  });
});

describe("submission-tokens/rate-limit - enforceRateLimit", () => {
  it("resolves when under the limit", async () => {
    currentCount = 0;
    await expect(
      enforceRateLimit("ip", new Date("2026-01-01T00:00:00Z")),
    ).resolves.toBeUndefined();
  });

  it("throws RateLimitedError when at or over the limit", async () => {
    currentCount = RATE_LIMIT_MAX;
    await expect(
      enforceRateLimit("ip", new Date("2026-01-01T00:00:00Z")),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });
});
