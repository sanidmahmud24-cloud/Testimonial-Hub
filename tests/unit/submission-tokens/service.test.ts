import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "node:crypto";

// vi.hoisted runs before module evaluation so the vi.mock factory (also
// hoisted to the top of the file) can reference these symbols safely.
const mocks = vi.hoisted(() => {
  // In-memory SubmissionToken store. We model the row shape the production
  // service actually creates (including createdAt), so the rate-limit
  // `count` query can read it back.
  const tokenRows = new Map<
    string,
    {
      id: string;
      workspaceId: string;
      tokenHash: string;
      ipHash: string;
      userAgent: string | null;
      createdAt: Date;
      expiresAt: Date;
      consumedAt: Date | null;
    }
  >();
  const idCounter = { n: 0 };

  function findByHash(tokenHash: string) {
    for (const r of tokenRows.values()) {
      if (r.tokenHash === tokenHash) return r;
    }
    return null;
  }

  const findUnique = vi.fn(async ({ where }: { where: { tokenHash: string } }) => {
    return findByHash(where.tokenHash);
  });

  const create = vi.fn(
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
      for (const r of tokenRows.values()) {
        if (r.tokenHash === data.tokenHash) {
          const err = new Error("Unique constraint") as Error & { code: string };
          err.code = "P2002";
          throw err;
        }
      }
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

  const updateMany = vi.fn(
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

  const count = vi.fn(
    async ({
      where,
    }: {
      where: { ipHash: string; createdAt: { gte: Date } };
    }) => {
      const cutoff = where.createdAt.gte.getTime();
      let n = 0;
      for (const r of tokenRows.values()) {
        if (
          r.ipHash === where.ipHash &&
          r.createdAt.getTime() >= cutoff
        ) {
          n += 1;
        }
      }
      return n;
    },
  );

  return { tokenRows, idCounter, findUnique, create, updateMany, count };
});

vi.mock("@/lib/db", () => ({
  db: {
    submissionToken: {
      create: mocks.create,
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
      count: mocks.count,
    },
  },
}));

import {
  mintSubmissionToken,
  consumeToken,
  hashToken,
  hashIp,
  TOKEN_TTL_MS,
} from "@/lib/submission-tokens/service";

/**
 * Build a `tx`-shaped object that delegates to the same in-memory
 * store. The production service takes a `Prisma.TransactionClient`,
 * so the mock must expose the same surface (`findUnique`,
 * `updateMany`).
 */
function makeTx() {
  return {
    submissionToken: {
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
    },
  };
}

beforeEach(() => {
  mocks.tokenRows.clear();
  mocks.idCounter.n = 0;
  vi.clearAllMocks();
});

describe("submission-tokens/service - hashing", () => {
  it("hashToken is deterministic for the same input", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("hashToken differs across inputs", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("hashToken is a 64-char hex string (SHA-256)", () => {
    expect(hashToken("x")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashIp mixes the salt into the SHA-256 (ip:salt ordering)", () => {
    const h1 = hashIp("203.0.113.1", "saltA");
    const h2 = hashIp("203.0.113.1", "saltB");
    expect(h1).not.toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    // Sanity: matches the canonical derivation.
    const expected = createHash("sha256")
      .update("203.0.113.1:saltA")
      .digest("hex");
    expect(h1).toBe(expected);
  });
});

describe("submission-tokens/service - mint", () => {
  it("returns a plaintext token and a row keyed by its hash", async () => {
    const { plaintext, expiresAt } = await mintSubmissionToken({
      workspaceId: "ws_1",
      ipSalt: "salty",
      ip: "203.0.113.1",
      userAgent: "ua",
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(plaintext.length).toBeGreaterThanOrEqual(32);
    expect(expiresAt.getTime()).toBe(
      new Date("2026-01-01T00:00:00Z").getTime() + TOKEN_TTL_MS,
    );
    expect(mocks.tokenRows.size).toBe(1);
    const row = Array.from(mocks.tokenRows.values())[0];
    expect(row.tokenHash).toBe(hashToken(plaintext));
    // Raw plaintext must not be persisted.
    expect(JSON.stringify(row)).not.toContain(plaintext);
  });

  it("sets createdAt on the row (used by the rate-limit window)", async () => {
    const at = new Date("2026-02-02T12:00:00Z");
    await mintSubmissionToken({
      workspaceId: "ws_1",
      ipSalt: "salty",
      ip: "203.0.113.1",
      userAgent: "ua",
      now: at,
    });
    const row = Array.from(mocks.tokenRows.values())[0];
    expect(row.createdAt.getTime()).toBe(at.getTime());
  });
});

describe("submission-tokens/service - consume", () => {
  it("consumes a fresh, unexpired token exactly once", async () => {
    const { plaintext } = await mintSubmissionToken({
      workspaceId: "ws_1",
      ipSalt: "salty",
      ip: "203.0.113.1",
      userAgent: "ua",
      now: new Date("2026-01-01T00:00:00Z"),
    });
    const tx = makeTx();
    const first = await consumeToken(
      tx as never,
      plaintext,
      new Date("2026-01-01T00:00:10Z"),
    );
    expect(first.ok).toBe(true);
    const second = await consumeToken(
      tx as never,
      plaintext,
      new Date("2026-01-01T00:00:20Z"),
    );
    expect(second.ok).toBe(false);
  });

  it("rejects an unknown token", async () => {
    const r = await consumeToken(
      makeTx() as never,
      "nope",
      new Date("2026-01-01T00:00:10Z"),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects an expired token", async () => {
    const { plaintext } = await mintSubmissionToken({
      workspaceId: "ws_1",
      ipSalt: "salty",
      ip: "203.0.113.1",
      userAgent: "ua",
      now: new Date("2026-01-01T00:00:00Z"),
    });
    const r = await consumeToken(
      makeTx() as never,
      plaintext,
      new Date(
        new Date("2026-01-01T00:00:00Z").getTime() + TOKEN_TTL_MS + 1,
      ),
    );
    expect(r.ok).toBe(false);
  });
});

// Sanity: the create-hash import resolves as expected.
describe("createHash sanity", () => {
  it("SHA-256 of 'abc' matches the canonical vector", () => {
    const expected =
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    expect(createHash("sha256").update("abc").digest("hex")).toBe(expected);
  });
});
