-- CreateEnum
CREATE TYPE "RiskProfile" AS ENUM ('AGGRESSIVE', 'SEMI', 'CONSERVATIVE');

-- AlterTable
ALTER TABLE "PortfolioDailySignal" ADD COLUMN "riskProfile" "RiskProfile" NOT NULL DEFAULT 'CONSERVATIVE';
