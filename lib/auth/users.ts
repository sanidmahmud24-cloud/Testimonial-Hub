// The single module that owns User-table access for authentication concerns.
// Server-only. Zod 4 input validation at the boundary.
import "server-only";
import { z } from "zod";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

const createUserInput = z.object({
  email: z.email().max(254),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
});

export type CreateUserInput = z.input<typeof createUserInput>;

/**
 * Create a new user. Throws on validation failure or duplicate email.
 * The password is hashed before it ever leaves this module.
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const parsed = createUserInput.parse(input);
  const passwordHash = await hashPassword(parsed.password);

  try {
    return await db.user.create({
      data: {
        email: parsed.email.toLowerCase(),
        name: parsed.name,
        passwordHash,
      },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new Error("A user with that email already exists.");
    }
    throw err;
  }
}

/** Find a user by their email, or null if not present. Case-insensitive. */
export async function getUserByEmail(email: string): Promise<User | null> {
  if (!email) return null;
  return db.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

/** Find a user by their id, or null if not present. */
export async function getUserById(id: string): Promise<User | null> {
  if (!id) return null;
  return db.user.findUnique({ where: { id } });
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}