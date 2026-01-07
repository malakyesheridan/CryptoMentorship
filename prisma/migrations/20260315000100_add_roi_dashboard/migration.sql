-- CreateTable
CREATE TABLE "DashboardSetting" (
    "id" TEXT NOT NULL DEFAULT 'dashboard_settings',
    "inceptionDate" TIMESTAMP(3) NOT NULL,
    "disclaimerText" TEXT NOT NULL DEFAULT '',
    "showBtcBenchmark" BOOLEAN NOT NULL DEFAULT true,
    "showEthBenchmark" BOOLEAN NOT NULL DEFAULT true,
    "showSimulator" BOOLEAN NOT NULL DEFAULT true,
    "showChangeLog" BOOLEAN NOT NULL DEFAULT true,
    "showAllocation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "DashboardSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceSeries" (
    "id" TEXT NOT NULL,
    "seriesType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationSnapshot" (
    "id" TEXT NOT NULL DEFAULT 'allocation_snapshot',
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "items" JSONB NOT NULL,
    "cashWeight" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "AllocationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLogEvent" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "ChangeLogEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoiDashboardSnapshot" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoiDashboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardSetting_updatedAt_idx" ON "DashboardSetting"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceSeries_seriesType_date_key" ON "PerformanceSeries"("seriesType", "date");

-- CreateIndex
CREATE INDEX "PerformanceSeries_seriesType_date_idx" ON "PerformanceSeries"("seriesType", "date");

-- CreateIndex
CREATE INDEX "AllocationSnapshot_updatedAt_idx" ON "AllocationSnapshot"("updatedAt");

-- CreateIndex
CREATE INDEX "ChangeLogEvent_date_idx" ON "ChangeLogEvent"("date");

-- CreateIndex
CREATE INDEX "ChangeLogEvent_createdAt_idx" ON "ChangeLogEvent"("createdAt");

-- CreateIndex
CREATE INDEX "RoiDashboardSnapshot_scope_cacheKey_idx" ON "RoiDashboardSnapshot"("scope", "cacheKey");

-- CreateIndex
CREATE INDEX "RoiDashboardSnapshot_createdAt_idx" ON "RoiDashboardSnapshot"("createdAt");

-- AddForeignKey
ALTER TABLE "DashboardSetting" ADD CONSTRAINT "DashboardSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationSnapshot" ADD CONSTRAINT "AllocationSnapshot_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLogEvent" ADD CONSTRAINT "ChangeLogEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
