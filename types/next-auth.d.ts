// Augment NextAuth types so session.user.id is strongly typed everywhere.
// This is the v5 way of extending the Session/User/JWT shapes.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

export {};