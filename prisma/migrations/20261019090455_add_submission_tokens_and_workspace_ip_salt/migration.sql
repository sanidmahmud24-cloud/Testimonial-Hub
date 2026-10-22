-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "ipSalt" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "submission_tokens" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "submission_tokens_tokenHash_key" ON "submission_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "submission_tokens_workspaceId_expiresAt_idx" ON "submission_tokens"("workspaceId", "expiresAt");

-- CreateIndex
CREATE INDEX "submission_tokens_ipHash_createdAt_idx" ON "submission_tokens"("ipHash", "createdAt");

-- AddForeignKey
ALTER TABLE "submission_tokens" ADD CONSTRAINT "submission_tokens_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce the 1..5 rating range at the storage layer. Complements the Zod
-- input validator in lib/testimonials/validation.ts. See SRS Appendix B.3.
ALTER TABLE "testimonials"
  ADD CONSTRAINT "testimonials_rating_range"
  CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
