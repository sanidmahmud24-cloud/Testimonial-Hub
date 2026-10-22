import { describe, it, expect, beforeEach, vi } from "vitest";

// Stub the Prisma client before importing the module under test.
const userStore = new Map<
  string,
  { id: string; email: string; name: string; passwordHash: string }
>();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
        for (const u of userStore.values()) {
          if (where.id && u.id === where.id) return u;
          if (where.email && u.email === where.email) return u;
        }
        return null;
      }),
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            id?: string;
            email: string;
            name: string;
            passwordHash: string;
          };
        }) => {
          for (const u of userStore.values()) {
            if (u.email === data.email) {
              const err = new Error("Unique constraint failed") as Error & {
                code: string;
              };
              err.code = "P2002";
              throw err;
            }
          }
          const id = data.id ?? `usr_${userStore.size + 1}`;
          const u = { id, ...data };
          userStore.set(id, u);
          return u;
        },
      ),
    },
  },
}));

import { createUser, getUserByEmail, getUserById } from "@/lib/auth/users";

beforeEach(() => {
  userStore.clear();
  vi.clearAllMocks();
});

describe("auth/users", () => {
  it("createUser stores a hashed password, not the plaintext", async () => {
    const user = await createUser({
      email: "alice@example.com",
      name: "Alice",
      password: "plain-text-password",
    });
    expect(user.email).toBe("alice@example.com");
    expect(user.passwordHash).not.toBe("plain-text-password");
    expect(user.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
  });

  it("createUser rejects an invalid email", async () => {
    await expect(
      createUser({ email: "not-an-email", name: "X", password: "p" }),
    ).rejects.toThrow(/email/i);
  });

  it("createUser rejects a too-short password", async () => {
    await expect(
      createUser({ email: "bob@example.com", name: "Bob", password: "short" }),
    ).rejects.toThrow(/password/i);
  });

  it("createUser rejects a duplicate email", async () => {
    await createUser({
      email: "dup@example.com",
      name: "First",
      password: "longenoughpw",
    });
    await expect(
      createUser({
        email: "dup@example.com",
        name: "Second",
        password: "longenoughpw",
      }),
    ).rejects.toThrow(/already/i);
  });

  it("getUserByEmail returns the persisted user", async () => {
    const created = await createUser({
      email: "carol@example.com",
      name: "Carol",
      password: "longenoughpw",
    });
    const found = await getUserByEmail("carol@example.com");
    expect(found?.id).toBe(created.id);
  });

  it("getUserByEmail returns null for an unknown email", async () => {
    expect(await getUserByEmail("nobody@example.com")).toBeNull();
  });

  it("getUserById returns the persisted user", async () => {
    const created = await createUser({
      email: "dave@example.com",
      name: "Dave",
      password: "longenoughpw",
    });
    const found = await getUserById(created.id);
    expect(found?.email).toBe("dave@example.com");
  });
});