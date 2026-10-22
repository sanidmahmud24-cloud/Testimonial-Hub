import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter. The @prisma/adapter-pg package wraps
// the node-postgres driver so we can pass DATABASE_URL at runtime.
//
// See: https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and configure it.",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
