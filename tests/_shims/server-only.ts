// No-op replacement for the real "server-only" package under Vitest.
// The real package throws when imported from a client module; in tests we
// always run in a server-like Node environment, so the guard is irrelevant.
export {};
