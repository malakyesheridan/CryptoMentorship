-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- Ensure UUID generation is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- AlterTable
ALTER TABLE "User" ADD COLUMN "defaultRiskProfile" "RiskProfile";
ALTER TABLE "User" ADD COLUMN "selectedRiskProfile" "RiskProfile";

-- CreateTable
CREATE TABLE "user_onboarding_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "wizardKey" TEXT NOT NULL DEFAULT 'RISK_ONBOARDING_V1',
    "answers" JSONB NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_onboarding_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_risk_profile" (
    "userId" TEXT NOT NULL,
    "recommendedProfile" "RiskProfile" NOT NULL,
    "score" INTEGER NOT NULL,
    "drivers" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "overriddenByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "adminOverrideProfile" "RiskProfile",
    "adminOverrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_risk_profile_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_responses_userId_wizardKey_key" ON "user_onboarding_responses"("userId", "wizardKey");

-- CreateIndex
CREATE INDEX "user_onboarding_responses_status_idx" ON "user_onboarding_responses"("status");

-- CreateIndex
CREATE INDEX "user_onboarding_responses_userId_idx" ON "user_onboarding_responses"("userId");

-- CreateIndex
CREATE INDEX "user_risk_profile_recommendedProfile_idx" ON "user_risk_profile"("recommendedProfile");

-- CreateIndex
CREATE INDEX "user_risk_profile_completedAt_idx" ON "user_risk_profile"("completedAt");

-- AddForeignKey
ALTER TABLE "user_onboarding_responses" ADD CONSTRAINT "user_onboarding_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_risk_profile" ADD CONSTRAINT "user_risk_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

