// Next.js 16 renamed middleware.ts -> proxy.ts. The function still gates
// requests, just under a new name. Runs on the Edge, so this file MUST NOT
// import anything that pulls Node-only code (e.g. bcrypt, the Prisma client).
// The Credentials provider (with bcrypt) lives in auth.ts, not here.
//
// Logic is unchanged from the previous middleware.ts:
//   - Protects /dashboard routes via the authorized() callback in auth.config.ts.
//   - Runs on everything except Next internals and static assets.
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};