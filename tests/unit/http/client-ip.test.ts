import { describe, it, expect, beforeEach, vi } from "vitest";

// We control TRUSTED_PROXY through @/lib/env.
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ TRUSTED_PROXY }),
}));

import { getClientIp } from "@/lib/http/client-ip";

let TRUSTED_PROXY = false;

function h(entries: Record<string, string>): Headers {
  const out = new Headers();
  for (const [k, v] of Object.entries(entries)) out.set(k, v);
  return out;
}

beforeEach(() => {
  TRUSTED_PROXY = false;
});

describe("http/client-ip - TRUSTED_PROXY=false (default)", () => {
  it("returns the socket IP when one is provided", () => {
    expect(getClientIp(h({}), "203.0.113.7")).toBe("203.0.113.7");
  });

  it("ignores x-forwarded-for even if a forged value is present", () => {
    expect(
      getClientIp(h({ "x-forwarded-for": "198.51.100.1" }), "203.0.113.7"),
    ).toBe("203.0.113.7");
  });

  it("returns empty string when no socket IP is available", () => {
    expect(getClientIp(h({ "x-forwarded-for": "198.51.100.1" }), "")).toBe("");
  });
});

describe("http/client-ip - TRUSTED_PROXY=true", () => {
  beforeEach(() => {
    TRUSTED_PROXY = true;
  });

  it("uses the leftmost x-forwarded-for when present and valid", () => {
    const headers = h({
      "x-forwarded-for": "198.51.100.1, 203.0.113.7",
    });
    expect(getClientIp(headers, "10.0.0.1")).toBe("198.51.100.1");
  });

  it("falls back to socket IP when x-forwarded-for is missing", () => {
    expect(getClientIp(h({}), "10.0.0.1")).toBe("10.0.0.1");
  });

  it("falls back to socket IP when x-forwarded-for is malformed", () => {
    const headers = h({ "x-forwarded-for": "not-an-ip" });
    expect(getClientIp(headers, "10.0.0.1")).toBe("10.0.0.1");
  });

  it("falls back to socket IP when x-forwarded-for is empty", () => {
    const headers = h({ "x-forwarded-for": "" });
    expect(getClientIp(headers, "10.0.0.1")).toBe("10.0.0.1");
  });
});
