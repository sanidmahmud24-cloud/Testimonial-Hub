import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory stores for workspace and testimonial tables.
const workspaces = new Map<
  string,
  { id: string; ownerId: string; name: string; slug: string; ipSalt: string }
>();
const testimonials = new Map<
  string,
  {
    id: string;
    workspaceId: string;
    submitterName: string;
    content: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    isFeatured: boolean;
    isPublished: boolean;
    createdAt: Date;
  }
>();

vi.mock("@/lib/db", () => ({
  db: {
    workspace: {
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) => {
          return workspaces.get(where.id) ?? null;
        },
      ),
    },
    testimonial: {
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) => {
          return testimonials.get(where.id) ?? null;
        },
      ),
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { workspaceId: string; status?: string };
        }) => {
          let rows = Array.from(testimonials.values()).filter(
            (t) => t.workspaceId === where.workspaceId,
          );
          if (where.status) rows = rows.filter((t) => t.status === where.status);
          return rows;
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<{
            status: "PENDING" | "APPROVED" | "REJECTED";
            isFeatured: boolean;
            isPublished: boolean;
          }>;
        }) => {
          const existing = testimonials.get(where.id);
          if (!existing) throw new Error("Not found");
          const updated = { ...existing, ...data };
          testimonials.set(where.id, updated);
          return updated;
        },
      ),
      delete: vi.fn(
        async ({ where }: { where: { id: string } }) => {
          const existing = testimonials.get(where.id);
          if (!existing) throw new Error("Not found");
          testimonials.delete(where.id);
          return existing;
        },
      ),
    },
  },
}));

import {
  setTestimonialStatus,
  setTestimonialFeatured,
  setTestimonialPublished,
  deleteTestimonial,
  listTestimonialsForOwner,
  NotTestimonialOwnerError,
  TestimonialNotFoundError,
} from "@/lib/testimonials/moderation";

beforeEach(() => {
  workspaces.clear();
  testimonials.clear();
});

function seedWorkspaceAndTestimonial() {
  workspaces.set("ws_1", {
    id: "ws_1",
    ownerId: "user_1",
    name: "Acme",
    slug: "acme",
    ipSalt: "salt",
  });
  testimonials.set("tst_1", {
    id: "tst_1",
    workspaceId: "ws_1",
    submitterName: "Ada",
    content: "Great product.",
    status: "PENDING",
    isFeatured: false,
    isPublished: false,
    createdAt: new Date(),
  });
}

describe("testimonials/moderation - setTestimonialStatus", () => {
  it("updates status when caller is the owner", async () => {
    seedWorkspaceAndTestimonial();
    const updated = await setTestimonialStatus("tst_1", "user_1", "APPROVED");
    expect(updated.status).toBe("APPROVED");
  });

  it("rejects when caller is not the owner", async () => {
    seedWorkspaceAndTestimonial();
    await expect(
      setTestimonialStatus("tst_1", "user_2", "APPROVED"),
    ).rejects.toBeInstanceOf(NotTestimonialOwnerError);
  });

  it("rejects when testimonial does not exist", async () => {
    seedWorkspaceAndTestimonial();
    await expect(
      setTestimonialStatus("nope", "user_1", "APPROVED"),
    ).rejects.toBeInstanceOf(TestimonialNotFoundError);
  });
});

describe("testimonials/moderation - setTestimonialFeatured", () => {
  it("toggles isFeatured for the owner", async () => {
    seedWorkspaceAndTestimonial();
    const updated = await setTestimonialFeatured("tst_1", "user_1", true);
    expect(updated.isFeatured).toBe(true);
  });
});

describe("testimonials/moderation - setTestimonialPublished", () => {
  it("toggles isPublished for the owner", async () => {
    seedWorkspaceAndTestimonial();
    const updated = await setTestimonialPublished("tst_1", "user_1", true);
    expect(updated.isPublished).toBe(true);
  });
});

describe("testimonials/moderation - listTestimonialsForOwner", () => {
  it("returns testimonials for the owner's workspace", async () => {
    seedWorkspaceAndTestimonial();
    const rows = await listTestimonialsForOwner("ws_1", "user_1");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("tst_1");
  });

  it("rejects when caller is not the owner", async () => {
    seedWorkspaceAndTestimonial();
    await expect(
      listTestimonialsForOwner("ws_1", "user_2"),
    ).rejects.toBeInstanceOf(NotTestimonialOwnerError);
  });
});

describe("testimonials/moderation - deleteTestimonial", () => {
  it("removes the testimonial when caller is the owner", async () => {
    seedWorkspaceAndTestimonial();
    await deleteTestimonial("tst_1", "user_1");
    expect(testimonials.has("tst_1")).toBe(false);
  });

  it("rejects when caller is not the owner", async () => {
    seedWorkspaceAndTestimonial();
    await expect(deleteTestimonial("tst_1", "user_2")).rejects.toBeInstanceOf(
      NotTestimonialOwnerError,
    );
    // Row is still there — no partial state.
    expect(testimonials.has("tst_1")).toBe(true);
  });

  it("rejects when the testimonial does not exist", async () => {
    seedWorkspaceAndTestimonial();
    await expect(deleteTestimonial("nope", "user_1")).rejects.toBeInstanceOf(
      TestimonialNotFoundError,
    );
  });
});
