// One-off DB smoke test. Tries to count users and workspaces via the
// existing Prisma client. Prints only a tiny status blob, never secrets.

import { db } from "../lib/db.ts";

async function main() {
  try {
    const [users, workspaces, testimonials, submissionTokens] = await Promise.all([
      db.user.count(),
      db.workspace.count(),
      db.testimonial.count(),
      db.submissionToken.count(),
    ]);
    console.log(
      JSON.stringify({
        ok: true,
        users,
        workspaces,
        testimonials,
        submissionTokens,
      }),
    );
  } catch (e) {
    console.log(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
  } finally {
    await db.$disconnect();
  }
}

main();
