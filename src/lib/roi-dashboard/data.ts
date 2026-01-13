import { prisma } from '@/lib/prisma'
import { toNum } from '@/lib/num'
import type {
  AllocationSnapshot,
  ChangeLogEvent,
  DashboardSettings,
  PerformancePoint,
  RoiDashboardPayload,
  SeriesType
} from './types'
import {
  calculateAllocationSplit,
  calculateMaxDrawdown,
  calculateRoiLastNDays,
  calculateRoiSinceInception,
  formatDate
} from './metrics'
import { buildValidationSummary } from './validation'

const CACHE_SCOPE = 'DASHBOARD'
const CACHE_MAX_AGE_HOURS = 6
const CACHE_MAX_ENTRIES = 10

function isCacheValid(createdAt: Date, maxAgeHours: number = CACHE_MAX_AGE_HOURS): boolean {
  const now = new Date()
  const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  return ageHours < maxAgeHours
}

function maxDate(...dates: Array<Date | null | undefined>): Date | null {
  const validDates = dates.filter((date): date is Date => !!date)
  if (validDates.length === 0) return null
  return new Date(Math.max(...validDates.map((date) => date.getTime())))
}

function buildSettingsPayload(
  settings: {
    inceptionDate: Date
    disclaimerText: string
    showBtcBenchmark: boolean
    showEthBenchmark: boolean
    showSimulator: boolean
    showChangeLog: boolean
    showAllocation: boolean
  } | null,
  fallbackInceptionDate: string
): DashboardSettings {
  if (!settings) {
    return {
      inceptionDate: fallbackInceptionDate,
      disclaimerText:
        'This dashboard is for educational purposes only and does not constitute financial advice.',
      showBtcBenchmark: true,
      showEthBenchmark: true,
      showSimulator: true,
      showChangeLog: true,
      showAllocation: true
    }
  }

  return {
    inceptionDate: formatDate(settings.inceptionDate),
    disclaimerText: settings.disclaimerText,
    showBtcBenchmark: settings.showBtcBenchmark,
    showEthBenchmark: settings.showEthBenchmark,
    showSimulator: settings.showSimulator,
    showChangeLog: settings.showChangeLog,
    showAllocation: settings.showAllocation
  }
}

function mapSeriesRows(rows: Array<{ seriesType: string; date: Date; value: any }>): Record<SeriesType, PerformancePoint[]> {
  const series: Record<SeriesType, PerformancePoint[]> = {
    MODEL: [],
    BTC: [],
    ETH: []
  }

  for (const row of rows) {
    const seriesType = row.seriesType as SeriesType
    if (!series[seriesType]) continue
    series[seriesType].push({
      date: formatDate(row.date),
      value: toNum(row.value)
    })
  }

  return series
}

function mapAllocationSnapshot(record: any | null): AllocationSnapshot | null {
  if (!record) return null
  const items = Array.isArray(record.items) ? record.items : []
  return {
    asOfDate: formatDate(record.asOfDate),
    items: items.map((item: any) => ({
      asset: String(item.asset ?? ''),
      weight: Number(item.weight ?? 0)
    })),
    cashWeight: toNum(record.cashWeight)
  }
}

function mapChangeLogEvents(records: Array<any>): ChangeLogEvent[] {
  return records.map((event) => ({
    id: event.id,
    date: formatDate(event.date),
    title: event.title,
    summary: event.summary,
    linkUrl: event.linkUrl
  }))
}

export async function getRoiDashboardPayload(options?: { forceRefresh?: boolean }): Promise<RoiDashboardPayload> {
  const [settingsRecord, allocationRecord, changeLogLatest, seriesMeta] = await Promise.all([
    prisma.dashboardSetting.findUnique({ where: { id: 'dashboard_settings' } }),
    prisma.allocationSnapshot.findFirst({
      where: { portfolioKey: 'dashboard' },
      orderBy: { asOfDate: 'desc' }
    }),
    prisma.changeLogEvent.findFirst({ orderBy: { updatedAt: 'desc' } }),
    prisma.performanceSeries.groupBy({
      by: ['seriesType'],
      _count: { _all: true },
      _max: { updatedAt: true },
      where: { portfolioKey: 'dashboard' }
    })
  ])

  const seriesKey = seriesMeta
    .map((entry) => `${entry.seriesType}:${entry._count._all}:${entry._max.updatedAt?.getTime() ?? 0}`)
    .sort()
    .join('|')
  const cacheKey = [
    settingsRecord?.updatedAt?.getTime() ?? 0,
    allocationRecord?.updatedAt?.getTime() ?? 0,
    changeLogLatest?.updatedAt?.getTime() ?? 0,
    seriesKey
  ].join('|')

  if (!options?.forceRefresh) {
    const cached = await prisma.roiDashboardSnapshot.findFirst({
      where: { scope: CACHE_SCOPE, cacheKey },
      orderBy: { createdAt: 'desc' }
    })

    if (cached && isCacheValid(cached.createdAt)) {
      return JSON.parse(cached.payload) as RoiDashboardPayload
    }
  }

  const seriesRows = await prisma.performanceSeries.findMany({
    where: { seriesType: { in: ['MODEL', 'BTC', 'ETH'] }, portfolioKey: 'dashboard' },
    orderBy: { date: 'asc' }
  })
  const series = mapSeriesRows(seriesRows)
  const modelSeries = series.MODEL
  const btcSeries = series.BTC
  const ethSeries = series.ETH

  const fallbackInception = modelSeries.length > 0 ? modelSeries[0].date : formatDate(new Date())
  const settings = buildSettingsPayload(settingsRecord, fallbackInception)
  const allocation = mapAllocationSnapshot(allocationRecord)
  const changeLogEvents = mapChangeLogEvents(
    await prisma.changeLogEvent.findMany({
      orderBy: { date: 'desc' },
      take: 5
    })
  )

  const roiSinceInception = calculateRoiSinceInception(modelSeries)
  const roiLast30Days = calculateRoiLastNDays(modelSeries, 30)
  const maxDrawdown = calculateMaxDrawdown(modelSeries)
  const allocationSplit = calculateAllocationSplit(allocation)

  const lastUpdatedAt = maxDate(
    settingsRecord?.updatedAt,
    allocationRecord?.updatedAt,
    changeLogLatest?.updatedAt,
    ...seriesMeta.map((entry) => entry._max.updatedAt)
  )

  const asOfDate = allocation?.asOfDate ?? modelSeries[modelSeries.length - 1]?.date ?? null

  const metrics = {
    roiSinceInceptionPct: roiSinceInception,
    roiLast30DaysPct: roiLast30Days,
    maxDrawdownPct: maxDrawdown,
    investedPct: allocationSplit.investedPct,
    cashPct: allocationSplit.cashPct,
    lastUpdatedAt: lastUpdatedAt ? lastUpdatedAt.toISOString() : null,
    asOfDate
  }

  const validation = buildValidationSummary({
    settings,
    modelSeries,
    btcSeries,
    ethSeries,
    allocation
  })

  const payload: RoiDashboardPayload = {
    settings,
    series: {
      model: modelSeries,
      btc: btcSeries,
      eth: ethSeries
    },
    allocation,
    changeLogEvents,
    metrics,
    validation
  }

  await prisma.roiDashboardSnapshot.create({
    data: {
      scope: CACHE_SCOPE,
      cacheKey,
      payload: JSON.stringify(payload)
    }
  })

  const oldSnapshots = await prisma.roiDashboardSnapshot.findMany({
    where: { scope: CACHE_SCOPE },
    orderBy: { createdAt: 'desc' },
    skip: CACHE_MAX_ENTRIES
  })

  if (oldSnapshots.length > 0) {
    await prisma.roiDashboardSnapshot.deleteMany({
      where: { id: { in: oldSnapshots.map((snapshot) => snapshot.id) } }
    })
  }

  return payload
}

export async function invalidateRoiDashboardCache() {
  await prisma.roiDashboardSnapshot.deleteMany({ where: { scope: CACHE_SCOPE } })
}
