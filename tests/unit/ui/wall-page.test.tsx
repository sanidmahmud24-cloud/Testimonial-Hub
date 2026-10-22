// Rendering tests for the public Wall of Love page (/c/[slug]/wall).
//
// These lock in the behavior the redesign must not regress:
//   - only the workspace's PUBLISHED + APPROVED testimonials render
//   - a pending/rejected testimonial never reaches the page
//   - the empty state renders instead of a blank grid
//   - the submission CTA and share controls are present and wired
//
// The page is an async server component, so we render it with
// `renderToStaticMarkup` against mocked workspace/testimonial data,
// mirroring the harness style used in tests/unit/ui/button.test.tsx.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

type SeedTestimonial = {
  id: string;
  submitterName: string;
  role: string | null;
  company: string | null;
  content: string;
  rating: number | null;
  isFeatured: boolean;
  createdAt: Date;
};

const workspace = {
  id: "ws_1",
  ownerId: "usr_1",
  name: "Acme Corp",
  slug: "acme",
  description: "We make things.",
  logoUrl: null as string | null,
  themeColor: "#7c3aed" as string | null,
  ipSalt: "salt",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

// Seed rows already filtered to what the public projection returns. The
// service's own APPROVED+isPublished filter is covered separately in
// tests/unit/testimonials/public.test.ts; here we assert the page does
// not add, drop, or leak anything it is handed.
const published: SeedTestimonial[] = [];

vi.mock("@/lib/workspaces/service", () => ({
  getWorkspaceBySlug: vi.fn(async () => workspace),
}));

vi.mock("@/lib/testimonials/public", () => ({
  listPublishedTestimonials: vi.fn(async () => published),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "localhost:3000" })),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import WallOfLovePage from "@/app/c/[slug]/wall/page";

// The page is an async server component, so we resolve its promise
// before handing the resolved element tree to the static renderer.
async function renderWall() {
  const element = await WallOfLovePage({
    params: Promise.resolve({ slug: "acme" }),
  });
  return renderToStaticMarkup(element);
}

beforeEach(() => {
  published.length = 0;
});

describe("wall of love — published content only", () => {
  it("renders the workspace name and the Wall of Love heading", async () => {
    const html = await renderWall();
    expect(html).toContain("Wall of Love");
    expect(html).toContain("Acme Corp");
  });

  it("renders a published testimonial with its name and content", async () => {
    published.push({
      id: "t1",
      submitterName: "Ada Lovelace",
      role: "Engineer",
      company: "Analytical Engines",
      content: "This product changed how I work.",
      rating: 5,
      isFeatured: false,
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });
    const html = await renderWall();
    expect(html).toContain("This product changed how I work.");
    expect(html).toContain("Ada Lovelace");
    // Role · company are rendered as a single subtitle line.
    expect(html).toContain("Engineer");
    expect(html).toContain("Analytical Engines");
  });

  it("renders initials for the avatar", async () => {
    published.push({
      id: "t1",
      submitterName: "Ada Lovelace",
      role: null,
      company: null,
      content: "Great.",
      rating: null,
      isFeatured: false,
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });
    const html = await renderWall();
    expect(html).toContain("AL");
  });

  it("renders exactly one card per published testimonial", async () => {
    for (let i = 0; i < 4; i++) {
      published.push({
        id: `t${i}`,
        submitterName: `Person ${i}`,
        role: null,
        company: null,
        content: `Content number ${i}`,
        rating: null,
        isFeatured: false,
        createdAt: new Date("2026-02-01T00:00:00Z"),
      });
    }
    const html = await renderWall();
    for (let i = 0; i < 4; i++) {
      expect(html).toContain(`Content number ${i}`);
    }
    expect((html.match(/<article/g) ?? []).length).toBe(4);
  });
});

describe("wall of love — empty state", () => {
  it("renders a graceful empty state with no published testimonials", async () => {
    const html = await renderWall();
    expect(html).toContain("No testimonials here yet");
    expect(html).not.toContain("<article");
  });

  it("still offers a submission path in the empty state", async () => {
    const html = await renderWall();
    expect(html).toContain("Submit the first testimonial");
  });
});

describe("wall of love — share controls and CTA", () => {
  it("renders copy, X and LinkedIn share targets for the wall URL", async () => {
    published.push({
      id: "t1",
      submitterName: "Ada",
      role: null,
      company: null,
      content: "Great.",
      rating: 5,
      isFeatured: false,
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });
    const html = await renderWall();
    expect(html).toContain("twitter.com/intent/tweet");
    expect(html).toContain("linkedin.com/sharing/share-offsite");
    // Both must open safely in a new tab.
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("keeps the submission CTA pointing at the public collection page", async () => {
    const html = await renderWall();
    expect(html).toContain("Submit your own testimonial");
    expect(html).toContain('href="/c/acme"');
  });

  it("hides the share row when there is nothing to share", async () => {
    const html = await renderWall();
    expect(html).not.toContain("twitter.com/intent/tweet");
  });
});