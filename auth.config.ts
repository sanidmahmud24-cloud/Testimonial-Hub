// Edge-safe slice of the NextAuth config.
// This file MUST NOT import anything that pulls Node-only code (e.g. bcrypt,
// the Prisma client). It is imported by middleware.ts which runs on the Edge.
//
// The Credentials provider (with bcrypt) lives in auth.ts, not here.

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * Authorization gate used by middleware. Returning false redirects to
     * the sign-in page; returning true lets the request through.
     */
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const path = request.nextUrl.pathname;
      const isOnDashboard = path.startsWith("/dashboard");
      if (isOnDashboard) return isLoggedIn;
      return true;
    },
    /**
     * Persist the user id in the JWT so the session callback (and any
     * downstream server code) can load the user without re-querying.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    /**
     * Expose user.id on the session so server components can read it.
     */
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  // No providers here — they're added in auth.ts where Node modules are safe.
  providers: [],
} satisfies NextAuthConfig;