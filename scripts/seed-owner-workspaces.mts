// Provision seven company workspaces under one Owner account.
//
// What this script does
// ---------------------
// 1. Upserts the Owner user (creates if absent, leaves alone if present).
//    The Owner's password is whatever was passed on the command line —
//    if the user existed, the existing password is kept (we do NOT reset
//    credentials on a re-run; that would be the wrong default).
// 2. For each of the seven company names, idempotently creates a
//    Workspace owned by that user with a name-derived slug and a
//    per-company description. If a workspace with the same slug
//    already exists (any owner — ownerId uniqueness is enforced by
//    `Workspace.slug @unique` at the DB level), the row is skipped
//    with a "already exists" line so the script is safe to re-run.
//
// What this script deliberately does NOT do
// ----------------------------------------
// - It does NOT auto-run on dev/prod startup. The application must
//   never insert fake companies on its own; provisioning is an
//   explicit Operator action.
// - It does NOT delete or rewrite any existing data.
// - It does NOT touch authentication, the schema, or service code.
//
// Usage
// -----
//   node --import ./scripts/ts-paths.mjs --env-file=.env \
//     scripts/seed-owner-workspaces.mts \
//     owner@testimonial-hub.local 'OwnerPass123!' "Owner of 7 Brands"
//
// The three positional args are: <email> <password> <display-name>.
// Password is required to be at least 8 characters (matches the
// createUser zod schema in lib/auth/users.ts).

import { register } from "node:module";
import { pathToFileURL } from "node:url";
// @ts-expect-error virtual module
register("./scripts/ts-paths.mjs", pathToFileURL("./"));

import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const { db } = await import("../lib/db.ts");
const { createUser } = await import("../lib/auth/users.ts");
const { getUserByEmail } = await import("../lib/auth/users.ts");
const {
  createWorkspace,
  getWorkspaceBySlug,
  DuplicateSlugError,
  InvalidSlugError,
} = await import("../lib/workspaces/service.ts");

type Company = {
  name: string;
  slug: string;
  description: string;
};

const COMPANIES: ReadonlyArray<Company> = [
  {
    name: "Brain Station 23",
    slug: "brain-station-23",
    description:
      "Customer testimonials and feedback for Brain Station 23 — software, design, and product engineering.",
  },
  {
    name: "AutoMobile",
    slug: "automobile",
    description:
      "Customer stories about AutoMobile — vehicle sourcing, dealer experience, and ownership review.",
  },
  {
    name: "TechNova Solutions",
    slug: "technova-solutions",
    description:
      "Customer feedback for TechNova Solutions — cloud, data, and platform engineering services.",
  },
  {
    name: "SmartCare Hospital",
    slug: "smartcare-hospital",
    description:
      "Patient and family feedback for SmartCare Hospital — care quality, scheduling, and outcomes.",
  },
  {
    name: "EduBridge Academy",
    slug: "edubridge-academy",
    description:
      "Learner and parent feedback for EduBridge Academy — courses, instructors, and learning outcomes.",
  },
  {
    name: "GreenLife Foods",
    slug: "greenlife-foods",
    description:
      "Customer feedback for GreenLife Foods — product quality, delivery, and customer service.",
  },
  {
    name: "NextGen Software",
    slug: "nextgen-software",
    description:
      "Customer feedback for NextGen Software — product usability, support, and developer experience.",
  },
];

function printTable(rows: Array<{ slug: string; status: string; id?: string }>) {
  const slugWidth = Math.max(
    "slug".length,
    ...rows.map((r) => r.slug.length),
  );
  const statusWidth = Math.max(
    "status".length,
    ...rows.map((r) => r.status.length),
  );
  const idWidth = Math.max("id".length, ...rows.map((r) => (r.id ?? "").length));
  const sep = `+${"-".repeat(slugWidth + 2)}+${"-".repeat(statusWidth + 2)}+${"-".repeat(idWidth + 2)}+`;
  const line = (slug: string, status: string, id: string) =>
    `| ${slug.padEnd(slugWidth)} | ${status.padEnd(statusWidth)} | ${id.padEnd(idWidth)} |`;
  console.log(sep);
  console.log(line("slug", "status", "id"));
  console.log(sep);
  for (const r of rows) console.log(line(r.slug, r.status, r.id ?? ""));
  console.log(sep);
}

async function main() {
  const [, , emailArg, passwordArg, nameArg] = process.argv;
  const email = emailArg?.trim();
  const password = passwordArg ?? "";
  const name = nameArg?.trim() || "Workspace Owner";

  if (!email || !password) {
    console.error(
      "Usage: scripts/seed-owner-workspaces.mts <email> <password> <name>",
    );
    process.exit(2);
  }

  // 1) Upsert the Owner user.
  let owner = await getUserByEmail(email);
  if (!owner) {
    owner = await createUser({ email, name, password });
    console.log(`[owner] created user ${owner.email} (id=${owner.id})`);
  } else {
    console.log(
      `[owner] user ${owner.email} already exists (id=${owner.id}); leaving password untouched`,
    );
  }

  // 2) Idempotently create each company workspace.
  const report: Array<{ slug: string; status: string; id?: string }> = [];
  for (const company of COMPANIES) {
    const existing = await getWorkspaceBySlug(company.slug);
    if (existing) {
      if (existing.ownerId !== owner.id) {
        // Slug is globally @unique. If someone else owns it, we cannot
        // take it over without rewriting their data, which we must
        // never do. Skip with a clear note and continue; do not abort
        // the rest of the provisioning.
        report.push({
          slug: company.slug,
          status: `skipped: owned by other user (id=${existing.ownerId})`,
          id: existing.id,
        });
        continue;
      }
      report.push({
        slug: company.slug,
        status: "already exists (kept)",
        id: existing.id,
      });
      continue;
    }
    try {
      const ws = await createWorkspace({
        ownerId: owner.id,
        name: company.name,
        slug: company.slug,
        description: company.description,
      });
      report.push({ slug: company.slug, status: "created", id: ws.id });
    } catch (err) {
      if (err instanceof DuplicateSlugError) {
        // Race with another writer between our findUnique and create.
        // Re-fetch and treat as already-exists.
        const after = await getWorkspaceBySlug(company.slug);
        report.push({
          slug: company.slug,
          status: "already exists (kept)",
          id: after?.id,
        });
      } else if (err instanceof InvalidSlugError) {
        report.push({
          slug: company.slug,
          status: `invalid slug: ${err.message}`,
        });
      } else {
        report.push({
          slug: company.slug,
          status: `error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  }

  console.log("");
  console.log("Workspace provisioning summary:");
  printTable(report);

  const created = report.filter((r) => r.status === "created").length;
  const kept = report.filter((r) => r.status.startsWith("already exists")).length;
  const skipped = report.filter((r) => r.status.startsWith("skipped")).length;
  console.log(
    `\nDone. Created: ${created}. Already existed: ${kept}. Skipped (owned by another user): ${skipped}. Total: ${report.length}.`,
  );
  if (skipped > 0) {
    console.log(
      "To adopt a skipped workspace under this Owner, have an admin re-point its ownerId — this script will not move data between accounts.",
    );
  }
}

try {
  await main();
} catch (e) {
  console.error(
    "seed-owner-workspaces error:",
    e instanceof Error ? e.message : String(e),
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}