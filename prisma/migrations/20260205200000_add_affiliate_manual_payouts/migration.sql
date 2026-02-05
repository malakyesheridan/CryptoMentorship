-- CreateTable
CREATE TABLE "AffiliateManualPayout" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "frequency" TEXT,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateManualPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateManualPayout_referrerId_idx" ON "AffiliateManualPayout"("referrerId");

-- CreateIndex
CREATE INDEX "AffiliateManualPayout_scheduledFor_idx" ON "AffiliateManualPayout"("scheduledFor");

-- CreateIndex
CREATE INDEX "AffiliateManualPayout_nextRunAt_idx" ON "AffiliateManualPayout"("nextRunAt");

-- AddForeignKey
ALTER TABLE "AffiliateManualPayout" ADD CONSTRAINT "AffiliateManualPayout_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
