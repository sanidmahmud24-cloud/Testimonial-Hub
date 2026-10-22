// Password hashing using bcrypt. The cost factor is intentionally moderate
// (12 rounds, ~250ms on a typical server) — enough to deter brute force
// without being punishing on shared hosting. Bump via env if needed.
//
// This module is server-only because the bcrypt import pulls in native code
// that should never be bundled to the client.
import "server-only";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

/** Hash a plaintext password. Returns a bcrypt hash string. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Constant-time comparison of a plaintext password against a stored bcrypt hash. */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}