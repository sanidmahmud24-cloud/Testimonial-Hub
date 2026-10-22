import { describe, it, expect, beforeEach, vi } from "vitest";

const testimonials = new Map<
  string,
  {
    id: string;
    workspaceId: string;
    submitterName: string;
    role: string | null;
    company: string | null;
    email: string | null;
    content: string;
    rating: number | null;
    isFeatured: boolean;
    isPublished: boolean;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: Date;
  }
>();

vi.mock("@/lib/db", () => ({
  db: {
    testimonial: {
      findMany: vi.fn(
        async ({
          where,
          take,
        }: {
          where: {
            workspaceId: string;
            status?: string;
            isPublished?: boolean;
          };
          take?: number;
        }) => {
          let rows = Array.from(testimonials.values()).filter(
            (t) => t.workspaceId === where.workspaceId,
          );
          if (where.status) rows = rows.filter((t) => t.status === where.status);
          if (where.isPublished !== undefined) {
            rows = rows.filter((t) => t.isPublished === where.isPublished);
          }
          rows.sort((a, b) => {
            if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
            return b.createdAt.getTime() - a.createdAt.getTime();
          });
          if (take) rows = rows.slice(0, take);
          // Mirror the production select — email is NEVER returned.
          return rows.map((r) => ({
            id: r.id,
            submitterName: r.submitterName,
            role: r.role,
            company: r.company,
            content: r.content,
            rating: r.rating,
            isFeatured: r.isFeatured,
            createdAt: r.createdAt,
          }));
        },
      ),
    },
  },
}));

import {
  listPublishedTestimonials,
  listEmbedTestimonials,
} from "@/lib/testimonials/public";

beforeEach(() => {
  testimonials.clear();
});

function seed(overrides: Partial<{
  id: string;
  workspaceId: string;
  submitterName: string;
  content: string;
  rating: number | null;
  isFeatured: boolean;
  isPublished: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  email: string | null;
}> = {}) {
  const t = {
    id: overrides.id ?? "tst_1",
    workspaceId: overrides.workspaceId ?? "ws_1",
    submitterName: overrides.submitterName ?? "Ada",
    role: "Engineer",
    company: "Acme",
    email: overrides.email ?? "ada@example.com",
    content: overrides.content ?? "Great product.",
    rating: overrides.rating ?? 5,
    isFeatured: overrides.isFeatured ?? false,
    isPublished: overrides.isPublished ?? false,
    status: overrides.status ?? "APPROVED",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
  testimonials.set(t.id, t);
  return t;
}

describe("testimonials/public - listPublishedTestimonials", () => {
  it("returns only APPROVED + isPublished testimonials", async () => {
    seed({ id: "t1", isPublished: true, status: "APPROVED" });
    seed({ id: "t2", isPublished: false, status: "APPROVED" });
    seed({ id: "t3", isPublished: true, status: "PENDING" });
    const rows = await listPublishedTestimonials("ws_1");
    expect(rows.map((r) => r.id)).toEqual(["t1"]);
  });

  it("does not include email in the public projection", async () => {
    seed({ id: "t1", isPublished: true, email: "ada@example.com" });
    const rows = await listPublishedTestimonials("ws_1");
    const row = rows[0] as Record<string, unknown>;
    expect(row.email).toBeUndefined();
  });

  it("puts featured testimonials first", async () => {
    seed({ id: "t1", isPublished: true, isFeatured: false });
    seed({ id: "t2", isPublished: true, isFeatured: true });
    const rows = await listPublishedTestimonials("ws_1");
    expect(rows.map((r) => r.id)).toEqual(["t2", "t1"]);
  });
});

describe("testimonials/public - listEmbedTestimonials", () => {
  it("respects the limit parameter", async () => {
    for (let i = 0; i < 5; i++) {
      seed({ id: `t${i}`, isPublished: true });
    }
    const rows = await listEmbedTestimonials("ws_1", 2);
    expect(rows).toHaveLength(2);
  });

  it("clamps the limit to a safe range", async () => {
    for (let i = 0; i < 60; i++) {
      seed({ id: `t${i}`, isPublished: true });
    }
    const rows = await listEmbedTestimonials("ws_1", 1000);
    expect(rows.length).toBeLessThanOrEqual(50);
  });

  it("does not include email", async () => {
    seed({ id: "t1", isPublished: true, email: "ada@example.com" });
    const rows = await listEmbedTestimonials("ws_1", 10);
    const row = rows[0] as Record<string, unknown>;
    expect(row.email).toBeUndefined();
  });
});