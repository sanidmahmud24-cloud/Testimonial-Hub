-- CreateEnum
CREATE TYPE "TestimonialStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "themeColor" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "submitterName" TEXT NOT NULL,
    "role" TEXT,
    "company" TEXT,
    "email" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER,
    "consentGiven" BOOLEAN NOT NULL,
    "status" "TestimonialStatus" NOT NULL DEFAULT 'PENDING',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonial_tags" (
    "testimonialId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "testimonial_tags_pkey" PRIMARY KEY ("testimonialId","tagId")
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" BIGSERIAL NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "referrerDomain" TEXT,
    "viewedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_ownerId_idx" ON "workspaces"("ownerId");

-- CreateIndex
CREATE INDEX "testimonials_workspaceId_status_idx" ON "testimonials"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "testimonials_workspaceId_isPublished_idx" ON "testimonials"("workspaceId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "tags_workspaceId_name_key" ON "tags"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "page_views_workspaceId_viewedAt_idx" ON "page_views"("workspaceId", "viewedAt");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonial_tags" ADD CONSTRAINT "testimonial_tags_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonial_tags" ADD CONSTRAINT "testimonial_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
