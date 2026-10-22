import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "node:crypto";

// vi.hoisted runs before module evaluation so the vi.mock factories
// (also hoisted to the top of the file) can reference these symbols
// safely. Both the env mock and the db mock factories close over
// hoisted state, following the same pattern that works in
// tests/unit/submission-tokens/service.test.ts.
const mocks = vi.hoisted(() => {
  // In-memory stores modelled on the production row shapes.
  const tokenRows = new Map<
    string,
    {
      id: string;
      workspaceId: string;
      tokenHash: string;
      ipHash: string;
      createdAt: Date;
      expiresAt: Date;
      consumedAt: Date | null;
    }
  >();
  const testimonialRows = new Map<
    string,
    {
      id: string;
      workspaceId: string;
      submitterName: string;
      content: string;
      role: string | null;
      company: string | null;
      email: string | null;
      rating: number | null;
      consentGiven: boolean;
      status: string;
      createdAt: Date;
    }
  >();
  const ipCounts = new Map<string, number>();
  const idCounter = { n: 0 };

  function ipHashFn(ip: string, salt: string): string {
    // Must match the canonical derivation in lib/submission-tokens/service.ts:
    // SHA-256(`${ip}:${ipSalt}`).
    return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
  }

  const tokenFindUnique = vi.fn(
    async ({
      where,
      include,
    }: {
      where: { tokenHash: string };
      include?: { workspace: boolean };
    }) => {
      for (const r of tokenRows.values()) {
        if (r.tokenHash === where.tokenHash) {
          if (include?.workspace) {
            return {
              ...r,
              workspace: { id: r.workspaceId, slug: "acme", ipSalt: "salty" },
            };
          }
          return r;
        }
      }
      return null;
    },
  );
  const tokenCreate = vi.fn(
    async ({
      data,
    }: {
      data: {
        workspaceId: string;
        tokenHash: string;
        ipHash: string;
        userAgent: string | null;
        createdAt: Date;
        expiresAt: Date;
      };
    }) => {
      idCounter.n += 1;
      const row = {
        id: `tok_${idCounter.n}`,
        ...data,
        consumedAt: null,
      };
      tokenRows.set(row.id, row);
      return row;
    },
  );
  const tokenUpdateMany = vi.fn(
    async ({
      where,
      data,
    }: {
      where: {
        tokenHash: string;
        consumedAt: Date | null;
        expiresAt: { gt: Date };
      };
      data: { consumedAt: Date };
    }) => {
      for (const r of tokenRows.values()) {
        if (
          r.tokenHash === where.tokenHash &&
          r.consumedAt === where.consumedAt &&
          r.expiresAt.getTime() > where.expiresAt.gt.getTime()
        ) {
          r.consumedAt = data.consumedAt;
          return { count: 1 };
        }
      }
      return { count: 0 };
    },
  );
  const tokenCount = vi.fn(
    async ({
      where,
    }: {
      where: { ipHash: string; createdAt: { gte: Date } };
    }) => {
      const cutoff = where.createdAt.gte.getTime();
      let n = 0;
      for (const r of tokenRows.values()) {
        if (r.ipHash === where.ipHash && r.createdAt.getTime() >= cutoff) {
          n += 1;
        }
      }
      // Test override: some scenarios inject a pre-existing count.
      n += ipCounts.get(where.ipHash) ?? 0;
      return n;
    },
  );
  const testimonialCreate = vi.fn(
    async ({
      data,
    }: {
      data: {
        workspaceId: string;
        submitterName: string;
        content: string;
        role: string | null;
        company: string | null;
        email: string | null;
        rating: number | null;
        consentGiven: boolean;
        status: string;
      };
    }) => {
      idCounter.n += 1;
      const row = {
        id: `tst_${idCounter.n}`,
        ...data,
        createdAt: new Date(),
      };
      testimonialRows.set(row.id, row);
      return row;
    },
  );

  // Controlled env for the production getEnv() call. This replaces
  // the real lib/env module so the Origin check sees a known
  // NEXT_PUBLIC_APP_URL instead of falling back to permissive dev mode.
  const env = {
    getEnv: () => ({
      NODE_ENV: "test" as const,
      DATABASE_URL:
        "postgresql://test:test@localhost:5432/test?sslmode=disable",
      AUTH_SECRET: "test-secret-32-chars-minimum-aaaaaaaaaaaa",
      NEXT_PUBLIC_APP_URL: "https://app.testimonial-hub.test",
    }),
  };

  return {
    tokenRows,
    testimonialRows,
    ipCounts,
    idCounter,
    ipHashFn,
    env,
    tokenFindUnique,
    tokenCreate,
    tokenUpdateMany,
    tokenCount,
    testimonialCreate,
  };
});

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test?sslmode=disable",
    AUTH_SECRET: "test-secret-32-chars-minimum-aaaaaaaaaaaa",
    NEXT_PUBLIC_APP_URL: "https://app.testimonial-hub.test",
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    submissionToken: {
      findUnique: mocks.tokenFindUnique,
      create: mocks.tokenCreate,
      updateMany: mocks.tokenUpdateMany,
      count: mocks.tokenCount,
    },
    testimonial: {
      create: mocks.testimonialCreate,
    },
    $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
      // Hand the service a tx-shaped object that exposes the same
      // functions as `db.submissionToken` / `db.testimonial`. This is
      // what a real Prisma $transaction does for the given model
      // delegate inside the callback.
      const tx = {
        submissionToken: {
          findUnique: mocks.tokenFindUnique,
          updateMany: mocks.tokenUpdateMany,
        },
        testimonial: {
          create: mocks.testimonialCreate,
        },
      };
      return cb(tx);
    }),
  },
}));

import {
  submitTestimonial,
  SubmissionRejectedError,
  verifyOrigin,
} from "@/lib/testimonials/service";
import { mintSubmissionToken } from "@/lib/submission-tokens/service";

beforeEach(() => {
  mocks.tokenRows.clear();
  mocks.testimonialRows.clear();
  mocks.ipCounts.clear();
  mocks.idCounter.n = 0;
  vi.clearAllMocks();
});

function ipHash(ip: string, salt: string): string {
  return mocks.ipHashFn(ip, salt);
}

function makeForm(overrides: Record<string, string> = {}): FormData {
  const base: Record<string, string> = {
    submitterName: "Ada",
    content: "Great product.",
    consentGiven: "on",
    website: "",
    renderedAt: String(Date.now() - 5000),
    token: "tok",
  };
  const merged = { ...base, ...overrides };
  const f = new FormData();
  for (const [k, v] of Object.entries(merged)) f.set(k, v);
  return f;
}

function goodHeaders(): Headers {
  const h = new Headers();
  h.set("origin", "https://app.testimonial-hub.test");
  return h;
}

describe("testimonials/service - verifyOrigin", () => {
  it("accepts a matching origin", () => {
    const h = new Headers();
    h.set("origin", "https://app.testimonial-hub.test");
    expect(verifyOrigin(h, "https://app.testimonial-hub.test").ok).toBe(true);
  });

  it("accepts a matching referer when origin is missing", () => {
    const h = new Headers();
    h.set("referer", "https://app.testimonial-hub.test/c/acme");
    expect(verifyOrigin(h, "https://app.testimonial-hub.test").ok).toBe(true);
  });

  it("rejects a mismatched origin", () => {
    const h = new Headers();
    h.set("origin", "https://evil.example");
    expect(verifyOrigin(h, "https://app.testimonial-hub.test").ok).toBe(false);
  });

  it("rejects when neither header is present", () => {
    expect(
      verifyOrigin(new Headers(), "https://app.testimonial-hub.test").ok,
    ).toBe(false);
  });

  it("treats empty base URL as permissive (dev)", () => {
    const h = new Headers();
    h.set("origin", "https://anything.example");
    expect(verifyOrigin(h, "").ok).toBe(true);
  });
});

describe("testimonials/service - submitTestimonial", () => {
  it("rejects with bad_origin on mismatched origin", async () => {
    const h = new Headers();
    h.set("origin", "https://evil.example");
    await expect(
      submitTestimonial({
        formData: makeForm(),
        headers: h,
        ip: "203.0.113.1",
      }),
    ).rejects.toMatchObject({ code: "bad_origin" });
  });

  it("rejects with too_fast when submitted under MIN_SUBMISSION_TIME_MS", async () => {
    const fd = makeForm({ renderedAt: String(Date.now()) });
    await expect(
      submitTestimonial({
        formData: fd,
        headers: goodHeaders(),
        ip: "203.0.113.1",
      }),
    ).rejects.toMatchObject({ code: "too_fast" });
  });

  it("rejects with validation_failed on invalid input", async () => {
    const fd = makeForm({ submitterName: "" });
    await expect(
      submitTestimonial({
        formData: fd,
        headers: goodHeaders(),
        ip: "203.0.113.1",
      }),
    ).rejects.toMatchObject({ code: "validation_failed" });
  });

  it("rejects with honeypot when website is filled", async () => {
    const fd = makeForm({ website: "https://spam.example" });
    await expect(
      submitTestimonial({
        formData: fd,
        headers: goodHeaders(),
        ip: "203.0.113.1",
      }),
    ).rejects.toMatchObject({ code: "honeypot" });
  });

  it("rejects with token_invalid when the token row is missing", async () => {
    const fd = makeForm({ token: "never-minted" });
    await expect(
      submitTestimonial({
        formData: fd,
        headers: goodHeaders(),
        ip: "203.0.113.1",
      }),
    ).rejects.toMatchObject({ code: "token_invalid" });
  });

  it("rejects with rate_limited when the IP has hit the cap", async () => {
    const salt = "salty";
    const ip = "203.0.113.99";
    const { plaintext } = await mintSubmissionToken({
      workspaceId: "ws_1",
      ipSalt: salt,
      ip,
      userAgent: "ua",
      now: new Date(),
    });
    // Simulate "already 5 consumed in window" by injecting the count.
    mocks.ipCounts.set(ipHash(ip, salt), 5);
    const fd = makeForm({ token: plaintext });
    await expect(
      submitTestimonial({
        formData: fd,
        headers: goodHeaders(),
        ip,
      }),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("persists a PENDING testimonial on the happy path", async () => {
    const { plaintext } = await mintSubmissionToken({
      workspaceId: "ws_1",
      ipSalt: "salty",
      ip: "203.0.113.10",
      userAgent: "ua",
      now: new Date(),
    });
    const fd = makeForm({ token: plaintext, rating: "5" });
    const result = await submitTestimonial({
      formData: fd,
      headers: goodHeaders(),
      ip: "203.0.113.10",
    });
    expect(result.workspaceSlug).toBe("acme");
    expect(result.testimonialId).toMatch(/^tst_/);
    const row = Array.from(mocks.testimonialRows.values())[0];
    expect(row.status).toBe("PENDING");
    expect(row.consentGiven).toBe(true);
    expect(row.rating).toBe(5);
  });
});

describe("testimonials/service - error code exhaustiveness", () => {
  it("SubmissionRejectedError carries a known code", () => {
    for (const code of [
      "rate_limited",
      "token_invalid",
      "honeypot",
      "too_fast",
      "too_slow",
      "bad_origin",
      "validation_failed",
      "server_error",
    ] as const) {
      const err = new SubmissionRejectedError(code);
      expect(err.code).toBe(code);
      // Public message must be the constant — never the internal code.
      expect(err.message).toBe("Submission rejected; please try again.");
    }
  });
});
