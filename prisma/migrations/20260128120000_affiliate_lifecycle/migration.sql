-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'SIGNED_UP', 'TRIAL', 'QUALIFIED', 'PAYABLE', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('FIXED', 'PERCENT');

-- CreateEnum
CREATE TYPE "AffiliatePayoutBatchStatus" AS ENUM ('DRAFT', 'READY', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "Referral"
ADD COLUMN     "referredEmail" TEXT,
ADD COLUMN     "referredName" TEXT,
ADD COLUMN     "slugUsed" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmTerm" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "clickedAt" TIMESTAMP(3),
ADD COLUMN     "signedUpAt" TIMESTAMP(3),
ADD COLUMN     "trialStartedAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "firstPaidAt" TIMESTAMP(3),
ADD COLUMN     "qualifiedAt" TIMESTAMP(3),
ADD COLUMN     "commissionType" "CommissionType",
ADD COLUMN     "commissionValue" DECIMAL(65,30),
ADD COLUMN     "commissionAmountCents" INTEGER,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'usd',
ADD COLUMN     "holdDays" INTEGER,
ADD COLUMN     "payableAt" TIMESTAMP(3),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidByUserId" TEXT,
ADD COLUMN     "payoutBatchId" TEXT;

-- Drop default so we can change type (old default cannot be cast to enum)
ALTER TABLE "Referral" ALTER COLUMN "status" DROP DEFAULT;

-- Update status values to new enum
ALTER TABLE "Referral"
ALTER COLUMN "status" TYPE "ReferralStatus" USING (
  CASE
    WHEN "status" ILIKE 'pending' THEN 'PENDING'
    WHEN "status" ILIKE 'completed' THEN 'SIGNED_UP'
    WHEN "status" ILIKE 'expired' THEN 'VOID'
    WHEN "status" ILIKE 'cancelled' THEN 'VOID'
    WHEN "status" ILIKE 'void' THEN 'VOID'
    WHEN "status" ILIKE 'paid' THEN 'PAID'
    ELSE 'PENDING'
  END
)::"ReferralStatus";

ALTER TABLE "Referral"
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Backfill baseline timeline + slug
UPDATE "Referral"
SET "signedUpAt" = COALESCE("completedAt", "createdAt")
WHERE "referredUserId" IS NOT NULL AND "signedUpAt" IS NULL;

UPDATE "Referral"
SET "slugUsed" = "referralCode"
WHERE "slugUsed" IS NULL;

UPDATE "Referral" r
SET "referredEmail" = u.email,
    "referredName" = u.name
FROM "User" u
WHERE r."referredUserId" = u.id
  AND (r."referredEmail" IS NULL OR r."referredName" IS NULL);

-- CreateTable
CREATE TABLE "AffiliatePayoutBatch" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "status" "AffiliatePayoutBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AffiliatePayoutBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Referral_payableAt_idx" ON "Referral"("payableAt");

-- CreateIndex
CREATE INDEX "Referral_payoutBatchId_idx" ON "Referral"("payoutBatchId");

-- CreateIndex
CREATE INDEX "AffiliatePayoutBatch_referrerId_idx" ON "AffiliatePayoutBatch"("referrerId");

-- CreateIndex
CREATE INDEX "AffiliatePayoutBatch_status_idx" ON "AffiliatePayoutBatch"("status");

-- CreateIndex
CREATE INDEX "AffiliatePayoutBatch_dueAt_idx" ON "AffiliatePayoutBatch"("dueAt");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_payoutBatchId_fkey" FOREIGN KEY ("payoutBatchId") REFERENCES "AffiliatePayoutBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliatePayoutBatch" ADD CONSTRAINT "AffiliatePayoutBatch_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliatePayoutBatch" ADD CONSTRAINT "AffiliatePayoutBatch_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
