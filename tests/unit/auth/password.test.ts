import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("auth/password", () => {
  it("hashes a plaintext password into a non-reversible string", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("correct horse battery staple");
    // bcrypt hashes start with $2a$, $2b$, or $2y$
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
  });

  it("produces a different hash for the same input (salt is random)", async () => {
    const a = await hashPassword("hunter2");
    const b = await hashPassword("hunter2");
    expect(a).not.toBe(b);
  });

  it("verifyPassword returns true for the matching password", async () => {
    const hash = await hashPassword("s3cret!");
    expect(await verifyPassword("s3cret!", hash)).toBe(true);
  });

  it("verifyPassword returns false for a wrong password", async () => {
    const hash = await hashPassword("s3cret!");
    expect(await verifyPassword("s3cret", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
    expect(await verifyPassword("S3cret!", hash)).toBe(false);
  });
});