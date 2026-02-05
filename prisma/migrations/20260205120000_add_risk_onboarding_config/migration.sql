-- CreateTable
CREATE TABLE "RiskOnboardingConfig" (
    "id" TEXT NOT NULL DEFAULT 'risk_onboarding_config',
    "wizardKey" TEXT NOT NULL DEFAULT 'RISK_ONBOARDING_V1',
    "version" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskOnboardingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskOnboardingConfig_updatedAt_idx" ON "RiskOnboardingConfig"("updatedAt");

-- AddForeignKey
ALTER TABLE "RiskOnboardingConfig" ADD CONSTRAINT "RiskOnboardingConfig_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
