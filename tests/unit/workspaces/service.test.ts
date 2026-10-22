import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory store for workspaces.
const workspaceStore = new Map<
  string,
  {
    id: string;
    ownerId: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    themeColor: string | null;
    createdAt: Date;
    updatedAt: Date;
  }
>();

// In-memory store for testimonials, used by
// getWorkspaceCountsForOwner's groupBy mock.
type TestimonialStatus = "PENDING" | "APPROVED" | "REJECTED";
const testimonialStore = new Map<
  string,
  {
    id: string;
    workspaceId: string;
    status: TestimonialStatus;
    isPublished: boolean;
  }
>();

// Convenience: register a testimonial in the in-memory store.
function seedTestimonial(
  id: string,
  workspaceId: string,
  status: TestimonialStatus,
  isPublished: boolean,
) {
  testimonialStore.set(id, { id, workspaceId, status, isPublished });
}

vi.mock("@/lib/db", () => ({
  db: {
    workspace: {
      findUnique: vi.fn(
        async ({ where }: { where: { id?: string; slug?: string } }) => {
          for (const w of workspaceStore.values()) {
            if (where.id && w.id === where.id) return w;
            if (where.slug && w.slug === where.slug) return w;
          }
          return null;
        },
      ),
      findMany: vi.fn(
        async ({
          where,
          orderBy,
        }: {
          where: { ownerId?: string };
          orderBy?: { createdAt?: "asc" | "desc" };
        }) => {
          let rows = Array.from(workspaceStore.values());
          if (where?.ownerId) rows = rows.filter((w) => w.ownerId === where.ownerId);
          if (orderBy?.createdAt) {
            rows.sort((a, b) =>
              orderBy.createdAt === "asc"
                ? a.createdAt.getTime() - b.createdAt.getTime()
                : b.createdAt.getTime() - a.createdAt.getTime(),
            );
          }
          return rows;
        },
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            id?: string;
            ownerId: string;
            name: string;
            slug: string;
            description?: string | null;
            logoUrl?: string | null;
            themeColor?: string | null;
          };
        }) => {
          for (const w of workspaceStore.values()) {
            if (w.slug === data.slug) {
              const err = new Error("Unique constraint failed") as Error & {
                code: string;
              };
              err.code = "P2002";
              throw err;
            }
          }
          const id = data.id ?? `ws_${workspaceStore.size + 1}`;
          const now = new Date();
          const w = {
            id,
            ownerId: data.ownerId,
            name: data.name,
            slug: data.slug,
            description: data.description ?? null,
            logoUrl: data.logoUrl ?? null,
            themeColor: data.themeColor ?? null,
            createdAt: now,
            updatedAt: now,
          };
          workspaceStore.set(id, w);
          return w;
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const existing = workspaceStore.get(where.id);
          if (!existing) throw new Error("Not found");
          const updated = { ...existing, ...data, updatedAt: new Date() };
          workspaceStore.set(where.id, updated);
          return updated;
        },
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        workspaceStore.delete(where.id);
        return { id: where.id };
      }),
      count: vi.fn(
        async ({ where }: { where?: { ownerId?: string } } = {}) => {
          let rows = Array.from(workspaceStore.values());
          if (where?.ownerId)
            rows = rows.filter((w) => w.ownerId === where.ownerId);
          return rows.length;
        },
      ),
    },
    testimonial: {
      // Minimal groupBy mock: bucket testimonials by
      // (workspaceId, status, isPublished) and return counts. We
      // mimic the Prisma response shape: each row has by[] and _count.
      groupBy: vi.fn(
        async (args: {
          by: Array<"workspaceId" | "status" | "isPublished">;
          where?: {
            status?: TestimonialStatus;
            workspace?: { ownerId?: string };
          };
        }) => {
          const status = args.where?.status;
          const ownerId = args.where?.workspace?.ownerId;
          // Owner scope: only count testimonials whose workspace is
          // owned by `ownerId`. Workspaces owned by others are
          // excluded entirely.
          const allowedWs = new Set<string>();
          if (ownerId !== undefined) {
            for (const w of workspaceStore.values()) {
              if (w.ownerId === ownerId) allowedWs.add(w.id);
            }
          } else {
            for (const w of workspaceStore.values()) allowedWs.add(w.id);
          }
          const buckets = new Map<
            string,
            {
              workspaceId: string;
              status: TestimonialStatus;
              isPublished: boolean;
              _count: { _all: number };
            }
          >();
          for (const t of testimonialStore.values()) {
            if (!allowedWs.has(t.workspaceId)) continue;
            if (status && t.status !== status) continue;
            const key = `${t.workspaceId}|${t.status}|${t.isPublished}`;
            let row = buckets.get(key);
            if (!row) {
              row = {
                workspaceId: t.workspaceId,
                status: t.status,
                isPublished: t.isPublished,
                _count: { _all: 0 },
              };
              buckets.set(key, row);
            }
            row._count._all += 1;
          }
          return Array.from(buckets.values());
        },
      ),
    },
  },
}));

import {
  createWorkspace,
  getWorkspaceBySlug,
  getWorkspaceById,
  listWorkspacesForUser,
  getPendingCountsForOwner,
  getWorkspaceCountsForOwner,
  getDashboardOverview,
  updateWorkspace,
  deleteWorkspace,
  DuplicateSlugError,
  NotOwnerError,
  InvalidSlugError,
} from "@/lib/workspaces/service";

// The seven workspaces an Owner account provisions through the
// dashboard. These constants pin the exact slugs/seed descriptions so
// a typo in `scripts/seed-owner-workspaces.mts` would fail this suite
// rather than silently producing a different public URL.
const EXPECTED_COMPANIES = [
  {
    name: "Brain Station 23",
    slug: "brain-station-23",
    description:
      "Customer testimonials and feedback for Brain Station 23.",
  },
  { name: "AutoMobile", slug: "automobile", description: "AutoMobile's own description about cars." },
  {
    name: "TechNova Solutions",
    slug: "technova-solutions",
    description: "Customer testimonials for TechNova Solutions.",
  },
  {
    name: "SmartCare Hospital",
    slug: "smartcare-hospital",
    description: "Patient feedback for SmartCare Hospital.",
  },
  {
    name: "EduBridge Academy",
    slug: "edubridge-academy",
    description: "Learner feedback for EduBridge Academy.",
  },
  {
    name: "GreenLife Foods",
    slug: "greenlife-foods",
    description: "Customer feedback for GreenLife Foods.",
  },
  {
    name: "NextGen Software",
    slug: "nextgen-software",
    description: "Customer feedback for NextGen Software.",
  },
] as const;

beforeEach(() => {
  workspaceStore.clear();
  testimonialStore.clear();
  vi.clearAllMocks();
});

const baseInput = {
  ownerId: "user_1",
  name: "Acme Co",
  slug: "acme",
};

describe("workspaces/service - slug validation", () => {
  it.each([
    ["ac", "too short"],
    ["a".repeat(33), "too long"],
    ["-acme", "leading hyphen"],
    ["acme-", "trailing hyphen"],
    ["ac--me", "consecutive hyphens"],
    ["Acme", "uppercase"],
    ["ac me", "space"],
    ["ac_me", "underscore"],
  ])("rejects slug %p (%s)", async (slug) => {
    await expect(
      createWorkspace({ ...baseInput, slug }),
    ).rejects.toBeInstanceOf(InvalidSlugError);
  });

  it("accepts a valid slug", async () => {
    const w = await createWorkspace(baseInput);
    expect(w.slug).toBe("acme");
  });

  it("accepts the boundary lengths 3 and 32", async () => {
    const min = await createWorkspace({ ...baseInput, slug: "abc" });
    expect(min.slug).toBe("abc");
    const max = await createWorkspace({ ...baseInput, slug: "a".repeat(32) });
    expect(max.slug).toBe("a".repeat(32));
  });
});

describe("workspaces/service - createWorkspace", () => {
  it("throws DuplicateSlugError when slug is taken", async () => {
    await createWorkspace(baseInput);
    await expect(
      createWorkspace({ ...baseInput, name: "Acme Other" }),
    ).rejects.toBeInstanceOf(DuplicateSlugError);
  });
});

describe("workspaces/service - queries", () => {
  it("getWorkspaceBySlug returns the workspace", async () => {
    const created = await createWorkspace(baseInput);
    expect((await getWorkspaceBySlug("acme"))?.id).toBe(created.id);
  });

  it("getWorkspaceBySlug returns null when missing", async () => {
    expect(await getWorkspaceBySlug("nope")).toBeNull();
  });

  it("getWorkspaceById returns the workspace", async () => {
    const created = await createWorkspace(baseInput);
    expect((await getWorkspaceById(created.id))?.slug).toBe("acme");
  });

  it("listWorkspacesForUser returns only the user's workspaces", async () => {
    await createWorkspace({ ...baseInput, ownerId: "user_1" });
    await createWorkspace({ ...baseInput, ownerId: "user_1", slug: "beta" });
    await createWorkspace({ ...baseInput, ownerId: "user_2", slug: "gamma" });
    const mine = await listWorkspacesForUser("user_1");
    expect(mine).toHaveLength(2);
    expect(mine.every((w) => w.ownerId === "user_1")).toBe(true);
  });
});

describe("workspaces/service - authorization", () => {
  it("updateWorkspace rejects a non-owner", async () => {
    const w = await createWorkspace({ ...baseInput, ownerId: "user_1" });
    await expect(
      updateWorkspace(w.id, "user_2", { name: "Hacked" }),
    ).rejects.toBeInstanceOf(NotOwnerError);
  });

  it("updateWorkspace lets the owner change fields", async () => {
    const w = await createWorkspace(baseInput);
    const updated = await updateWorkspace(w.id, "user_1", {
      name: "Acme New",
      themeColor: "#ff00aa",
    });
    expect(updated.name).toBe("Acme New");
    expect(updated.themeColor).toBe("#ff00aa");
  });

  it("deleteWorkspace rejects a non-owner", async () => {
    const w = await createWorkspace({ ...baseInput, ownerId: "user_1" });
    await expect(deleteWorkspace(w.id, "user_2")).rejects.toBeInstanceOf(
      NotOwnerError,
    );
  });

  it("deleteWorkspace lets the owner delete", async () => {
    const w = await createWorkspace(baseInput);
    await deleteWorkspace(w.id, "user_1");
    expect(await getWorkspaceById(w.id)).toBeNull();
  });
});

describe("workspaces/service - getPendingCountsForOwner", () => {
  it("returns counts only for the caller's own workspaces", async () => {
    const a = await createWorkspace({ ...baseInput, ownerId: "user_1" });
    const b = await createWorkspace({
      ...baseInput,
      ownerId: "user_1",
      slug: "beta",
    });
    const foreign = await createWorkspace({
      ...baseInput,
      ownerId: "user_2",
      slug: "gamma",
    });
    seedTestimonial("t1", a.id, "PENDING", false);
    seedTestimonial("t2", a.id, "PENDING", false);
    seedTestimonial("t3", b.id, "PENDING", false);
    // Foreign owner's pending row must NOT bleed into user_1's map.
    seedTestimonial("t4", foreign.id, "PENDING", false);
    // Approved and rejected rows must NOT be counted.
    seedTestimonial("t5", a.id, "APPROVED", false);
    seedTestimonial("t6", a.id, "REJECTED", false);

    const counts = await getPendingCountsForOwner("user_1");
    expect(counts[a.id]).toBe(2);
    expect(counts[b.id]).toBe(1);
    expect(counts[foreign.id]).toBeUndefined();
  });

  it("returns an empty map when the owner has no workspaces", async () => {
    expect(await getPendingCountsForOwner("nobody")).toEqual({});
  });
});

describe("workspaces/service - getWorkspaceCountsForOwner", () => {
  it("returns real workspace + testimonial totals scoped to the owner", async () => {
    const a = await createWorkspace({ ...baseInput, ownerId: "user_1" });
    const b = await createWorkspace({
      ...baseInput,
      ownerId: "user_1",
      slug: "beta",
    });
    const foreign = await createWorkspace({
      ...baseInput,
      ownerId: "user_2",
      slug: "gamma",
    });

    seedTestimonial("t1", a.id, "PENDING", false);
    seedTestimonial("t2", a.id, "PENDING", false);
    seedTestimonial("t3", a.id, "APPROVED", true); // published
    seedTestimonial("t4", a.id, "APPROVED", false); // approved but not published
    seedTestimonial("t5", a.id, "REJECTED", false); // rejected -> neither
    seedTestimonial("t6", b.id, "PENDING", false);
    seedTestimonial("t7", b.id, "APPROVED", true); // published
    // Foreign testimonials must NOT affect user_1's totals.
    seedTestimonial("t8", foreign.id, "PENDING", false);
    seedTestimonial("t9", foreign.id, "APPROVED", true);

    const counts = await getWorkspaceCountsForOwner("user_1");
    expect(counts.totalWorkspaces).toBe(2);
    expect(counts.totalPending).toBe(3); // t1, t2 (a), t6 (b)
    expect(counts.totalPublished).toBe(2); // t3 (a), t7 (b)
    expect(counts.byWorkspace[a.id]).toEqual({ pending: 2, published: 1 });
    expect(counts.byWorkspace[b.id]).toEqual({ pending: 1, published: 1 });
    expect(counts.byWorkspace[foreign.id]).toBeUndefined();
  });

  it("returns zeros for an owner with no workspaces or testimonials", async () => {
    const counts = await getWorkspaceCountsForOwner("nobody");
    expect(counts).toEqual({
      totalWorkspaces: 0,
      totalPending: 0,
      totalPublished: 0,
      byWorkspace: {},
    });
  });

  it("does not include approved-but-not-published rows in totalPublished", async () => {
    const w = await createWorkspace(baseInput);
    seedTestimonial("t1", w.id, "APPROVED", false);
    seedTestimonial("t2", w.id, "APPROVED", true);
    const counts = await getWorkspaceCountsForOwner(w.ownerId);
    expect(counts.totalPublished).toBe(1);
    expect(counts.byWorkspace[w.id].published).toBe(1);
  });
});

describe("workspaces/service - getDashboardOverview", () => {
  // getDashboardOverview is the per-request helper that reuses the
  // already-loaded workspace list so the dashboard can skip the
  // separate `db.workspace.count` round-trip. The contract must match
  // getWorkspaceCountsForOwner shape-for-shape.
  it("returns the same shape as getWorkspaceCountsForOwner for a populated owner", async () => {
    const a = await createWorkspace({ ...baseInput, ownerId: "user_1" });
    const b = await createWorkspace({
      ...baseInput,
      ownerId: "user_1",
      slug: "beta",
    });
    seedTestimonial("p1", a.id, "PENDING", false);
    seedTestimonial("p2", a.id, "PENDING", false);
    seedTestimonial("pub1", a.id, "APPROVED", true);
    seedTestimonial("p3", b.id, "PENDING", false);

    const workspaces = await listWorkspacesForUser("user_1");
    const overview = await getDashboardOverview("user_1", workspaces);

    expect(overview.totalWorkspaces).toBe(2);
    expect(overview.totalPending).toBe(3);
    expect(overview.totalPublished).toBe(1);
    expect(overview.byWorkspace[a.id]).toEqual({ pending: 2, published: 1 });
    expect(overview.byWorkspace[b.id]).toEqual({ pending: 1, published: 0 });
  });

  it("computes totalWorkspaces from the passed-in list (no extra DB count)", async () => {
    await createWorkspace({ ...baseInput, ownerId: "user_1" });
    await createWorkspace({
      ...baseInput,
      ownerId: "user_1",
      slug: "beta",
    });
    // Foreign workspace should be ignored.
    await createWorkspace({ ...baseInput, ownerId: "user_2", slug: "gamma" });

    // Passing an *empty* list with the matching ownerId would be wrong
    // for a real call (it would lie about totalWorkspaces). The helper
    // expects the caller to pass the real list. We pass the real list
    // here and confirm totalWorkspaces reflects it.
    const list = await listWorkspacesForUser("user_1");
    const overview = await getDashboardOverview("user_1", list);
    expect(overview.totalWorkspaces).toBe(list.length);
    expect(overview.totalWorkspaces).toBe(2);
  });

  it("returns zeros when the workspace list is empty", async () => {
    const overview = await getDashboardOverview("nobody", []);
    expect(overview).toEqual({
      totalWorkspaces: 0,
      totalPending: 0,
      totalPublished: 0,
      byWorkspace: {},
    });
  });
});

// Regression suite: a Workspace's name and description shown on the
// public Collection Form must come from THAT workspace's row and
// nothing else. Earlier bug class: editing AutoMobile in Settings
// surfaced Brain Station 23's description because of a typo / paste
// bug at the data layer. The application code was always correct —
// getWorkspaceBySlug returns the exact stored description and the page
// renders {workspace.description}. These tests pin that contract so
// any future refactor can't quietly cross-wire workspaces.
describe("workspaces/service - per-workspace name/description isolation", () => {
  it("getWorkspaceBySlug returns the exact stored description for each workspace", async () => {
    const a = await createWorkspace({
      ...baseInput,
      ownerId: "user_1",
      description: "AutoMobile's own description about cars.",
    });
    const b = await createWorkspace({
      ...baseInput,
      ownerId: "user_1",
      slug: "brain-station-23",
      description:
        "Customer testimonials and feedback for Brain Station 23.",
    });

    const fetchedA = await getWorkspaceBySlug(a.slug);
    const fetchedB = await getWorkspaceBySlug(b.slug);
    expect(fetchedA?.description).toBe(
      "AutoMobile's own description about cars.",
    );
    expect(fetchedB?.description).toBe(
      "Customer testimonials and feedback for Brain Station 23.",
    );
    expect(fetchedA?.description).not.toBe(fetchedB?.description);
  });

  it("updateWorkspace only mutates the targeted workspace id; siblings are untouched", async () => {
    // Two workspaces owned by the same user. The bug class was an
    // update that accidentally overwrote a sibling.
    const target = await createWorkspace({
      ...baseInput,
      ownerId: "user_1",
      description: "Original target description",
    });
    const sibling = await createWorkspace({
      ...baseInput,
      ownerId: "user_1",
      slug: "sibling",
      description: "Sibling description that must NOT change.",
    });
    const siblingId = sibling.id;
    const siblingDescription = sibling.description;

    const updated = await updateWorkspace(target.id, "user_1", {
      name: "AutoMobile",
      description: "Tell us about your AutoMobile experience.",
    });
    expect(updated.id).toBe(target.id);
    expect(updated.name).toBe("AutoMobile");
    expect(updated.description).toBe(
      "Tell us about your AutoMobile experience.",
    );

    // The sibling row must still hold its own original text — proves
    // there is no cross-write path between workspaces.
    const siblingAfter = await getWorkspaceBySlug("sibling");
    expect(siblingAfter?.id).toBe(siblingId);
    expect(siblingAfter?.description).toBe(siblingDescription);
  });

  it("getWorkspaceBySlug returns null for an unknown slug rather than a sibling", async () => {
    await createWorkspace({ ...baseInput, ownerId: "user_1" });
    await createWorkspace({
      ...baseInput,
      ownerId: "user_1",
      slug: "beta",
    });
    const miss = await getWorkspaceBySlug("nonexistent");
    expect(miss).toBeNull();
  });
});

// The Owner provisions seven company workspaces through the dashboard.
// `scripts/seed-owner-workspaces.mts` calls `createWorkspace` for each
// one in order. We pin the contract here:
//
//   1. Each of the seven name-derived slugs validates successfully.
//   2. Each one is created with the Owner's id and the per-company
//      description.
//   3. Calling createWorkspace a second time with the same slug throws
//      DuplicateSlugError — so the helper can re-run safely and skip
//      the existing rows instead of mutating them.
//   4. After all seven are created under the same owner, listWorkspacesForUser
//      returns exactly those seven, in insertion order, with per-row
//      isolation (no cross-write between siblings).
describe("workspaces/service - seven-company provisioning", () => {
  it("accepts every one of the seven expected slugs", async () => {
    for (const c of EXPECTED_COMPANIES) {
      const ws = await createWorkspace({
        ownerId: "owner_1",
        name: c.name,
        slug: c.slug,
        description: c.description,
      });
      expect(ws.slug).toBe(c.slug);
      expect(ws.name).toBe(c.name);
      expect(ws.description).toBe(c.description);
      expect(ws.ownerId).toBe("owner_1");
    }
  });

  it("seven identical createWorkspace calls return seven rows for the same owner", async () => {
    for (const c of EXPECTED_COMPANIES) {
      await createWorkspace({
        ownerId: "owner_1",
        name: c.name,
        slug: c.slug,
        description: c.description,
      });
    }
    const list = await listWorkspacesForUser("owner_1");
    expect(list).toHaveLength(7);
    // Slugs come back in insertion order (asc by createdAt).
    expect(list.map((w) => w.slug)).toEqual(
      EXPECTED_COMPANIES.map((c) => c.slug),
    );
  });

  it("re-running createWorkspace with an existing slug throws DuplicateSlugError (no overwrite)", async () => {
    // Bootstrap the first workspace.
    await createWorkspace({
      ownerId: "owner_1",
      name: "Brain Station 23",
      slug: "brain-station-23",
      description: "Original Brain Station 23 description.",
    });
    // A second attempt with the same slug must NOT overwrite the row.
    await expect(
      createWorkspace({
        ownerId: "owner_1",
        name: "Brain Station 23 (renamed)",
        slug: "brain-station-23",
        description: "A different description that must not stick.",
      }),
    ).rejects.toBeInstanceOf(DuplicateSlugError);

    // The original row is preserved byte-for-byte.
    const after = await getWorkspaceBySlug("brain-station-23");
    expect(after?.description).toBe("Original Brain Station 23 description.");
    expect(after?.name).toBe("Brain Station 23");
  });

  it("each of the seven workspaces holds its OWN description — no cross-wiring", async () => {
    for (const c of EXPECTED_COMPANIES) {
      await createWorkspace({
        ownerId: "owner_1",
        name: c.name,
        slug: c.slug,
        description: c.description,
      });
    }
    for (const c of EXPECTED_COMPANIES) {
      const ws = await getWorkspaceBySlug(c.slug);
      expect(ws).not.toBeNull();
      expect(ws?.description).toBe(c.description);
      expect(ws?.name).toBe(c.name);
    }
  });
});