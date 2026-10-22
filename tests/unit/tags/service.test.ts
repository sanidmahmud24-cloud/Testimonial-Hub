import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory stores for the four tables the tags service touches.
const workspaces = new Map<
  string,
  { id: string; ownerId: string; name: string; slug: string; ipSalt: string }
>();
const tags = new Map<
  string,
  { id: string; workspaceId: string; name: string; createdAt: Date }
>();
const testimonials = new Map<
  string,
  { id: string; workspaceId: string; status: string }
>();
const joins = new Map<
  string, // testimonialId|tagId
  { testimonialId: string; tagId: string }
>();

function joinKey(testimonialId: string, tagId: string) {
  return `${testimonialId}|${tagId}`;
}

vi.mock("@/lib/workspaces/service", () => ({
  getWorkspaceById: vi.fn(async (id: string) => {
    return workspaces.get(id) ?? null;
  }),
  NotOwnerError: class NotOwnerError extends Error {
    constructor() {
      super("not owner");
      this.name = "NotOwnerError";
    }
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    tag: {
      findMany: vi.fn(async ({ where }: { where: { workspaceId: string } }) => {
        return Array.from(tags.values())
          .filter((t) => t.workspaceId === where.workspaceId)
          .sort((a, b) => a.name.localeCompare(b.name));
      }),
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) => tags.get(where.id) ?? null,
      ),
      create: vi.fn(
        async ({ data }: { data: { workspaceId: string; name: string } }) => {
          // Enforce uniqueness the same way the schema does.
          for (const t of tags.values()) {
            if (
              t.workspaceId === data.workspaceId &&
              t.name === data.name
            ) {
              const err = new Error("Unique constraint failed") as Error & {
                code?: string;
              };
              err.code = "P2002";
              throw err;
            }
          }
          const row = {
            id: `tag_${tags.size + 1}`,
            workspaceId: data.workspaceId,
            name: data.name,
            createdAt: new Date(),
          };
          tags.set(row.id, row);
          return row;
        },
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const existing = tags.get(where.id);
        if (!existing) throw new Error("Not found");
        tags.delete(where.id);
        // Cascade joins.
        for (const [k, v] of joins) {
          if (v.tagId === where.id) joins.delete(k);
        }
        return existing;
      }),
    },
    testimonial: {
      findUnique: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { id: string };
          select?: { workspaceId?: boolean };
        }) => {
          const row = testimonials.get(where.id);
          if (!row) return null;
          if (select && Object.keys(select).length > 0) {
            return { workspaceId: row.workspaceId };
          }
          return row;
        },
      ),
    },
    testimonialTag: {
      findMany: vi.fn(
        async ({
          where,
          include,
        }: {
          where: { testimonialId: string; tag: { workspaceId: string } };
          include?: { tag?: boolean };
        }) => {
          const out = [];
          for (const j of joins.values()) {
            if (j.testimonialId !== where.testimonialId) continue;
            const tag = tags.get(j.tagId);
            if (!tag) continue;
            if (tag.workspaceId !== where.tag.workspaceId) continue;
            if (include?.tag) {
              out.push({ ...j, tag });
            } else {
              out.push(j);
            }
          }
          return out;
        },
      ),
      upsert: vi.fn(
        async ({
          where,
          create,
        }: {
          where: { testimonialId_tagId: { testimonialId: string; tagId: string } };
          create: { testimonialId: string; tagId: string };
        }) => {
          const key = joinKey(
            where.testimonialId_tagId.testimonialId,
            where.testimonialId_tagId.tagId,
          );
          const existing = joins.get(key);
          if (existing) return existing;
          const row = { ...create };
          joins.set(key, row);
          return row;
        },
      ),
      deleteMany: vi.fn(
        async ({
          where,
        }: {
          where: { testimonialId: string; tagId: string };
        }) => {
          const key = joinKey(where.testimonialId, where.tagId);
          const existing = joins.get(key);
          if (!existing) return { count: 0 };
          joins.delete(key);
          return { count: 1 };
        },
      ),
    },
  },
}));

import {
  listTagsForWorkspace,
  createTag,
  deleteTag,
  assignTagToTestimonial,
  removeTagFromTestimonial,
  listTagsForTestimonial,
  TagNotFoundError,
  DuplicateTagError,
} from "@/lib/tags/service";
// Imported lazily by the service via `await import(...)`. The mock
// module re-exports NotOwnerError under the same shape.
import { NotOwnerError } from "@/lib/workspaces/service";

beforeEach(() => {
  workspaces.clear();
  tags.clear();
  testimonials.clear();
  joins.clear();
});

function seedWorkspace() {
  workspaces.set("ws_1", {
    id: "ws_1",
    ownerId: "user_1",
    name: "Acme",
    slug: "acme",
    ipSalt: "salt",
  });
}

describe("tags/service - listTagsForWorkspace", () => {
  it("returns tags ordered by name for the owner", async () => {
    seedWorkspace();
    tags.set("tag_1", {
      id: "tag_1",
      workspaceId: "ws_1",
      name: "Beta",
      createdAt: new Date(),
    });
    tags.set("tag_2", {
      id: "tag_2",
      workspaceId: "ws_1",
      name: "Alpha",
      createdAt: new Date(),
    });

    const out = await listTagsForWorkspace("ws_1", "user_1");
    expect(out.map((t) => t.name)).toEqual(["Alpha", "Beta"]);
  });

  it("throws NotOwnerError when caller does not own the workspace", async () => {
    seedWorkspace();
    await expect(listTagsForWorkspace("ws_1", "user_2")).rejects.toBeInstanceOf(
      NotOwnerError,
    );
  });
});

describe("tags/service - createTag", () => {
  it("creates a tag and trims whitespace", async () => {
    seedWorkspace();
    const t = await createTag("ws_1", "user_1", "  Hello World  ");
    expect(t.name).toBe("Hello World");
  });

  it("rejects empty names", async () => {
    seedWorkspace();
    await expect(createTag("ws_1", "user_1", "   ")).rejects.toThrow();
  });

  it("rejects names longer than 40 characters", async () => {
    seedWorkspace();
    await expect(
      createTag("ws_1", "user_1", "x".repeat(41)),
    ).rejects.toThrow();
  });

  it("rejects names with disallowed characters", async () => {
    seedWorkspace();
    await expect(
      createTag("ws_1", "user_1", "!!!"),
    ).rejects.toThrow();
  });

  it("throws DuplicateTagError on unique-constraint violation", async () => {
    seedWorkspace();
    await createTag("ws_1", "user_1", "Duplicate");
    await expect(createTag("ws_1", "user_1", "Duplicate")).rejects.toBeInstanceOf(
      DuplicateTagError,
    );
  });

  it("rejects when caller is not the owner", async () => {
    seedWorkspace();
    await expect(
      createTag("ws_1", "user_2", "Anything"),
    ).rejects.toBeInstanceOf(NotOwnerError);
  });
});

describe("tags/service - deleteTag", () => {
  it("deletes a tag owned by the same workspace", async () => {
    seedWorkspace();
    const t = await createTag("ws_1", "user_1", "Customer");
    await deleteTag("ws_1", "user_1", t.id);
    expect(tags.has(t.id)).toBe(false);
  });

  it("throws TagNotFoundError when tag does not exist", async () => {
    seedWorkspace();
    await expect(
      deleteTag("ws_1", "user_1", "nope"),
    ).rejects.toBeInstanceOf(TagNotFoundError);
  });

  it("throws TagNotFoundError when tag belongs to a different workspace", async () => {
    seedWorkspace();
    workspaces.set("ws_2", {
      id: "ws_2",
      ownerId: "user_2",
      name: "Other",
      slug: "other",
      ipSalt: "salt",
    });
    tags.set("tag_2", {
      id: "tag_2",
      workspaceId: "ws_2",
      name: "Other",
      createdAt: new Date(),
    });
    await expect(
      deleteTag("ws_1", "user_1", "tag_2"),
    ).rejects.toBeInstanceOf(TagNotFoundError);
  });
});

describe("tags/service - assignTagToTestimonial", () => {
  it("creates a join row for matching workspace", async () => {
    seedWorkspace();
    const tag = await createTag("ws_1", "user_1", "Promo");
    testimonials.set("tst_1", { id: "tst_1", workspaceId: "ws_1", status: "PENDING" });
    await assignTagToTestimonial("ws_1", "user_1", tag.id, "tst_1");
    expect(joins.get(joinKey("tst_1", tag.id))).toBeTruthy();
  });

  it("is idempotent — calling twice does not throw", async () => {
    seedWorkspace();
    const tag = await createTag("ws_1", "user_1", "Promo");
    testimonials.set("tst_1", { id: "tst_1", workspaceId: "ws_1", status: "PENDING" });
    await assignTagToTestimonial("ws_1", "user_1", tag.id, "tst_1");
    await assignTagToTestimonial("ws_1", "user_1", tag.id, "tst_1");
    expect(joins.size).toBe(1);
  });

  it("throws TagNotFoundError when testimonial is in another workspace", async () => {
    seedWorkspace();
    const tag = await createTag("ws_1", "user_1", "Promo");
    testimonials.set("tst_1", { id: "tst_1", workspaceId: "ws_other", status: "PENDING" });
    await expect(
      assignTagToTestimonial("ws_1", "user_1", tag.id, "tst_1"),
    ).rejects.toBeInstanceOf(TagNotFoundError);
  });
});

describe("tags/service - removeTagFromTestimonial", () => {
  it("removes an existing join row", async () => {
    seedWorkspace();
    const tag = await createTag("ws_1", "user_1", "Promo");
    testimonials.set("tst_1", { id: "tst_1", workspaceId: "ws_1", status: "PENDING" });
    await assignTagToTestimonial("ws_1", "user_1", tag.id, "tst_1");
    await removeTagFromTestimonial("ws_1", "user_1", tag.id, "tst_1");
    expect(joins.has(joinKey("tst_1", tag.id))).toBe(false);
  });

  it("is idempotent — removing a missing join does not throw", async () => {
    seedWorkspace();
    const tag = await createTag("ws_1", "user_1", "Promo");
    testimonials.set("tst_1", { id: "tst_1", workspaceId: "ws_1", status: "PENDING" });
    await expect(
      removeTagFromTestimonial("ws_1", "user_1", tag.id, "tst_1"),
    ).resolves.toBeUndefined();
  });
});

describe("tags/service - listTagsForTestimonial", () => {
  it("returns only tags from the testimonial's workspace", async () => {
    seedWorkspace();
    const a = await createTag("ws_1", "user_1", "A");
    const b = await createTag("ws_1", "user_1", "B");
    testimonials.set("tst_1", { id: "tst_1", workspaceId: "ws_1", status: "PENDING" });
    await assignTagToTestimonial("ws_1", "user_1", a.id, "tst_1");
    await assignTagToTestimonial("ws_1", "user_1", b.id, "tst_1");

    const out = await listTagsForTestimonial("ws_1", "user_1", "tst_1");
    expect(out.map((t) => t.name).sort()).toEqual(["A", "B"]);
  });
});
