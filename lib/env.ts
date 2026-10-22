// Server-only environment validation. Fails fast if a required var is missing
// or malformed. Imported by anything that needs to read configuration.
//
// `server-only` throws if imported from a client module, preventing the bundle
// from leaking secrets into the browser.
import "server-only";
import { z } from "zod";

// Zod 4 top-level formats (e.g. z.email) are preferred over z.string().email().
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_TRUST_HOST: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  // When false (default), lib/http/client-ip.ts uses the socket IP only and
  // never reads X-Forwarded-For, X-Real-IP, or Client-IP. Set to true ONLY
  // when a known reverse proxy (Vercel, Cloudflare, self-hosted nginx) is
  // in front of the app. See SRS Appendix C.2.
  TRUSTED_PROXY: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Parse and validate process.env. Throws on first invalid or missing value.
 * Result is memoized so it's safe to call from many places.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n` +
        `Copy .env.example to .env and fill in the required values.`,
    );
  }
  cached = parsed.data;
  return cached;
}

/**
 * Test-only: clear the memoized env so the next `getEnv()` call
 * re-reads `process.env`. Production code never calls this; it exists
 * so unit tests can mutate env vars (e.g. via `vi.stubEnv`) and then
 * force a re-parse.
 */
export function __resetEnvCacheForTests(): void {
  cached = undefined;
}