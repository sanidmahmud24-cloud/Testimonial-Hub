import { describe, it, expect } from "vitest";
import {
  parseSubmissionFormData,
  InvalidTestimonialError,
} from "@/lib/testimonials/validation";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

const base = {
  submitterName: "Ada",
  content: "Loved the product.",
  consentGiven: "on",
  website: "",
  renderedAt: String(Date.now() - 5000),
  token: "tok-1",
};

describe("testimonials/validation - happy path", () => {
  it("accepts the minimum required fields", () => {
    const out = parseSubmissionFormData(fd(base));
    expect(out.submitterName).toBe("Ada");
    expect(out.consentGiven).toBe(true);
    // Empty honeypot is preserved as ""; only non-empty is rejected.
    expect(out.website).toBe("");
  });

  it("normalizes 'true' to true for consentGiven", () => {
    const out = parseSubmissionFormData(fd({ ...base, consentGiven: "true" }));
    expect(out.consentGiven).toBe(true);
  });

  it("parses optional email and rating", () => {
    const out = parseSubmissionFormData(
      fd({ ...base, email: "ada@example.com", rating: "4" }),
    );
    expect(out.email).toBe("ada@example.com");
    expect(out.rating).toBe(4);
  });
});

describe("testimonials/validation - required field enforcement", () => {
  it("rejects missing name", () => {
    const { submitterName, ...rest } = base;
    void submitterName;
    expect(() => parseSubmissionFormData(fd(rest))).toThrow(
      InvalidTestimonialError,
    );
  });

  it("rejects missing content", () => {
    const { content, ...rest } = base;
    void content;
    expect(() => parseSubmissionFormData(fd(rest))).toThrow(
      InvalidTestimonialError,
    );
  });

  it("rejects missing consent", () => {
    const { consentGiven, ...rest } = base;
    void consentGiven;
    expect(() => parseSubmissionFormData(fd(rest))).toThrow(
      InvalidTestimonialError,
    );
  });

  it("rejects consentGiven=false", () => {
    expect(() =>
      parseSubmissionFormData(fd({ ...base, consentGiven: "false" })),
    ).toThrow(InvalidTestimonialError);
  });

  it("rejects non-numeric rating", () => {
    expect(() =>
      parseSubmissionFormData(fd({ ...base, rating: "five" })),
    ).toThrow(InvalidTestimonialError);
  });

  it("rejects out-of-range rating (0, 6)", () => {
    expect(() =>
      parseSubmissionFormData(fd({ ...base, rating: "0" })),
    ).toThrow(InvalidTestimonialError);
    expect(() =>
      parseSubmissionFormData(fd({ ...base, rating: "6" })),
    ).toThrow(InvalidTestimonialError);
  });
});

describe("testimonials/validation - bot-defence fields", () => {
  it("rejects a non-empty honeypot website", () => {
    expect(() =>
      parseSubmissionFormData(fd({ ...base, website: "https://spam.example" })),
    ).toThrow(InvalidTestimonialError);
  });

  it("rejects a future renderedAt", () => {
    const future = String(Date.now() + 10 * 60 * 1000);
    expect(() =>
      parseSubmissionFormData(fd({ ...base, renderedAt: future })),
    ).toThrow(InvalidTestimonialError);
  });

  it("rejects a missing token", () => {
    const { token, ...rest } = base;
    void token;
    expect(() => parseSubmissionFormData(fd(rest))).toThrow(
      InvalidTestimonialError,
    );
  });
});

describe("testimonials/validation - length limits", () => {
  it("rejects content over 5000 chars", () => {
    expect(() =>
      parseSubmissionFormData(fd({ ...base, content: "x".repeat(5001) })),
    ).toThrow(InvalidTestimonialError);
  });

  it("rejects name over 120 chars", () => {
    expect(() =>
      parseSubmissionFormData(fd({ ...base, submitterName: "n".repeat(121) })),
    ).toThrow(InvalidTestimonialError);
  });

  it("rejects email over 254 chars", () => {
    const local = "a".repeat(64);
    const domain = `${"b".repeat(186)}.example`;
    const email = `${local}@${domain}`;
    expect(() =>
      parseSubmissionFormData(fd({ ...base, email })),
    ).toThrow(InvalidTestimonialError);
  });
});
