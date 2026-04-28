-- AlterEnum
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'NOTIFICATION_SYSTEM_SIGNAL';

-- CreateTable
CREATE TABLE "UserSystemAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "systemSlug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "UserSystemAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSystemAssignment_userId_systemSlug_key" ON "UserSystemAssignment"("userId", "systemSlug");

-- CreateIndex
CREATE INDEX "UserSystemAssignment_userId_idx" ON "UserSystemAssignment"("userId");

-- CreateIndex
CREATE INDEX "UserSystemAssignment_systemSlug_idx" ON "UserSystemAssignment"("systemSlug");

-- AddForeignKey
ALTER TABLE "UserSystemAssignment" ADD CONSTRAINT "UserSystemAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SystemSignalIngest" (
    "id" TEXT NOT NULL,
    "systemSlug" TEXT NOT NULL,
    "signalData" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailsQueued" INTEGER NOT NULL DEFAULT 0,
    "portfolioUpdated" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'api',
    "error" TEXT,

    CONSTRAINT "SystemSignalIngest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemSignalIngest_systemSlug_processedAt_idx" ON "SystemSignalIngest"("systemSlug", "processedAt");
