/*
  Warnings:

  - A unique constraint covering the columns `[userNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'RESET_PASSWORD', 'DEACTIVATE', 'ACTIVATE', 'DELETE', 'PERMANENT_DELETE', 'SEED_SOURCE_CREATE', 'SEED_SOURCE_UPDATE', 'SEED_SOURCE_DELETE');

-- CreateEnum
CREATE TYPE "SeedSourceType" AS ENUM ('ATTENDANCE', 'GRADES', 'CREDITS', 'LIVE_STATUS');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DEACTIVATED', 'PENDING_DELETE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deleteAfter" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "userNumber" INTEGER;

-- CreateTable
CREATE TABLE "SystemState" (
    "id" TEXT NOT NULL DEFAULT 'maintenance',
    "isUpdating" BOOLEAN NOT NULL DEFAULT false,
    "logs" JSONB NOT NULL DEFAULT '[]',
    "errorMsg" TEXT,
    "startedAt" TIMESTAMP(3),
    "tempData" JSONB DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "SeedSourceType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seed_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nextSuperAdmin" INTEGER NOT NULL DEFAULT 10000001,
    "nextAdmin" INTEGER NOT NULL DEFAULT 20000001,
    "nextTeacher" INTEGER NOT NULL DEFAULT 30000001,
    "nextStudent" INTEGER NOT NULL DEFAULT 40000001,

    CONSTRAINT "SystemCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "description" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_urls" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seed_urls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seed_sources_type_idx" ON "seed_sources"("type");

-- CreateIndex
CREATE INDEX "seed_sources_active_idx" ON "seed_sources"("active");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_targetUserId_idx" ON "audit_logs"("targetUserId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "seed_urls_type_idx" ON "seed_urls"("type");

-- CreateIndex
CREATE INDEX "seed_urls_active_idx" ON "seed_urls"("active");

-- CreateIndex
CREATE UNIQUE INDEX "users_userNumber_key" ON "users"("userNumber");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
