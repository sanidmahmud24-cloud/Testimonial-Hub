// Prisma 7 config. The datasource URL is read from the environment here and
// used by CLI commands (migrate, db push, studio, generate). The runtime
// PrismaClient in lib/db.ts reads DATABASE_URL via the @prisma/adapter-pg
// driver adapter.
//
// See: https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
