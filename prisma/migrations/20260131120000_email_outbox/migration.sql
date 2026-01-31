-- CreateEnum
CREATE TYPE "EmailOutboxStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('WELCOME_TRIAL');

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "toEmail" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EmailOutboxStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "toEmail" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_idempotencyKey_key" ON "EmailOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailOutbox_status_scheduledFor_idx" ON "EmailOutbox"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "EmailOutbox_userId_idx" ON "EmailOutbox"("userId");

-- CreateIndex
CREATE INDEX "EmailLog_userId_idx" ON "EmailLog"("userId");

-- CreateIndex
CREATE INDEX "EmailLog_type_idx" ON "EmailLog"("type");

-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

