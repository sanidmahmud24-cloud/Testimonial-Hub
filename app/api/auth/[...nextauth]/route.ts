// NextAuth route handlers. Auth.js v5 calls /api/auth/* for sign-in, sign-out,
// session lookup, etc.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;