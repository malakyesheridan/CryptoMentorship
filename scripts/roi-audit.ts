import { prisma } from '../src/lib/prisma'

function toDateKey(date: Date | null) {
  if (!date) return null
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

function sortByKey<T extends { key: string }>(rows: T[]) {
  return rows.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
}

async function run() {
  const now = new Date()
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))

  const signalCountSinceJan1 = await prisma.portfolioDailySignal.count({
    where: { publishedAt: { gte: startOfYear } }
  })

  const allocationGroup = await prisma.allocationSnapshot.groupBy({
    by: ['portfolioKey'],
    _count: { _all: true },
    _max: { asOfDate: true }
  })

  const navGroup = await prisma.performanceSeries.groupBy({
    by: ['portfolioKey'],
    _count: { _all: true },
    _max: { date: true },
    where: { seriesType: 'MODEL_NAV' }
  })

  const priceGroup = await prisma.assetPriceDaily.groupBy({
    by: ['symbol'],
    _count: { _all: true },
    _max: { date: true }
  })

  const roiSnapshots = await prisma.roiDashboardSnapshot.findMany({
    where: { scope: 'PORTFOLIO' },
    select: {
      portfolioKey: true,
      needsRecompute: true,
      recomputeFromDate: true,
      lastComputedAt: true,
      asOfDate: true,
      updatedAt: true
    }
  })

  const allocationSummary = sortByKey(
    allocationGroup.map((row) => ({
      key: row.portfolioKey,
      count: row._count._all,
      latestAsOfDate: toDateKey(row._max.asOfDate)
    }))
  )

  const navSummary = sortByKey(
    navGroup.map((row) => ({
      key: row.portfolioKey,
      count: row._count._all,
      latestDate: toDateKey(row._max.date)
    }))
  )

  const priceSummary = sortByKey(
    priceGroup.map((row) => ({
      key: row.symbol,
      count: row._count._all,
      latestDate: toDateKey(row._max.date)
    }))
  )

  const snapshotSummary = sortByKey(
    roiSnapshots
      .filter((row) => !!row.portfolioKey)
      .map((row) => ({
        key: row.portfolioKey ?? 'unknown',
        needsRecompute: row.needsRecompute,
        recomputeFromDate: toDateKey(row.recomputeFromDate),
        lastComputedAt: row.lastComputedAt?.toISOString() ?? null,
        asOfDate: toDateKey(row.asOfDate),
        updatedAt: row.updatedAt.toISOString()
      }))
  )

  console.log(JSON.stringify({
    generatedAt: now.toISOString(),
    startOfYear: startOfYear.toISOString(),
    signalCountSinceJan1,
    allocationSummary,
    navSummary,
    priceSummary,
    snapshotSummary
  }, null, 2))
}

run()
  .catch((error) => {
    console.error('ROI audit failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
