// Stub for the `server-only` package, used by scripts/ts-paths.mjs so
// that server-only libs can be imported from non-Next.js Node scripts.
// This file has no runtime effect inside Next.js (server-only stays the
// real package there — the resolver hook only fires for scripts run via
// scripts/*.mts).
export {};
