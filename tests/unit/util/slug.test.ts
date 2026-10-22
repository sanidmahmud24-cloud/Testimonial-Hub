import { describe, it, expect } from "vitest";
import { suggestSlug } from "@/lib/util/slug";

describe("suggestSlug", () => {
  it.each([
    ["Acme Co", "acme-co"],
    ["Hello World!", "hello-world"],
    ["  Trim & Lower  ", "trim-lower"],
    ["Café Society", "cafe-society"],
    ["a--b--c", "a-b-c"],
    ["   ", ""],
    ["!!!", ""],
  ])("suggests %p -> %p", (input, expected) => {
    expect(suggestSlug(input)).toBe(expected);
  });

  it("truncates to 32 chars", () => {
    const long = "a".repeat(50);
    expect(suggestSlug(long)).toHaveLength(32);
  });
});