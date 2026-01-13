-- AlterTable
ALTER TABLE "PerformanceSeries" ADD COLUMN "portfolioKey" TEXT NOT NULL DEFAULT 'dashboard';

-- DropIndex
DROP INDEX "PerformanceSeries_seriesType_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceSeries_seriesType_date_portfolioKey_key" ON "PerformanceSeries"("seriesType", "date", "portfolioKey");
CREATE INDEX "PerformanceSeries_portfolioKey_date_idx" ON "PerformanceSeries"("portfolioKey", "date");

-- AlterTable
ALTER TABLE "AllocationSnapshot" ADD COLUMN "portfolioKey" TEXT NOT NULL DEFAULT 'dashboard';
ALTER TABLE "AllocationSnapshot" ALTER COLUMN "cashWeight" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "AllocationSnapshot_portfolioKey_asOfDate_key" ON "AllocationSnapshot"("portfolioKey", "asOfDate");
CREATE INDEX "AllocationSnapshot_portfolioKey_asOfDate_idx" ON "AllocationSnapshot"("portfolioKey", "asOfDate");

-- CreateTable
CREATE TABLE "AssetPriceDaily" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "close" DECIMAL(65,30) NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetPriceDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetPriceDaily_symbol_date_key" ON "AssetPriceDaily"("symbol", "date");
CREATE INDEX "AssetPriceDaily_symbol_date_idx" ON "AssetPriceDaily"("symbol", "date");

-- AlterTable
ALTER TABLE "RoiDashboardSnapshot" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RoiDashboardSnapshot" ADD COLUMN "portfolioKey" TEXT;
ALTER TABLE "RoiDashboardSnapshot" ADD COLUMN "needsRecompute" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RoiDashboardSnapshot" ADD COLUMN "recomputeFromDate" TIMESTAMP(3);
ALTER TABLE "RoiDashboardSnapshot" ADD COLUMN "asOfDate" TIMESTAMP(3);
ALTER TABLE "RoiDashboardSnapshot" ADD COLUMN "roiInception" DECIMAL(65,30);
ALTER TABLE "RoiDashboardSnapshot" ADD COLUMN "roi30d" DECIMAL(65,30);
ALTER TABLE "RoiDashboardSnapshot" ADD COLUMN "maxDrawdown" DECIMAL(65,30);
ALTER TABLE "RoiDashboardSnapshot" ADD COLUMN "volatility" DECIMAL(65,30);
ALTER TABLE "RoiDashboardSnapshot" ADD COLUMN "lastComputedAt" TIMESTAMP(3);
ALTER TABLE "RoiDashboardSnapshot" ADD COLUMN "updatedByUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RoiDashboardSnapshot_scope_portfolioKey_key" ON "RoiDashboardSnapshot"("scope", "portfolioKey");
CREATE INDEX "RoiDashboardSnapshot_portfolioKey_idx" ON "RoiDashboardSnapshot"("portfolioKey");
CREATE INDEX "RoiDashboardSnapshot_needsRecompute_idx" ON "RoiDashboardSnapshot"("needsRecompute");

-- AddForeignKey
ALTER TABLE "RoiDashboardSnapshot" ADD CONSTRAINT "RoiDashboardSnapshot_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
