import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getDailyCloses } from '@/lib/prices/provider'
import { parseAllocationAssets } from '@/lib/portfolio-assets'
import { parsePortfolioKey } from '@/lib/portfolio/portfolio-key'
import { getPrimaryTicker, normalizeAssetSymbol } from '@/lib/prices/tickers'
import { Decimal, D, toNum } from '@/lib/num/dec'
import { Prisma, RiskProfile } from '@prisma/client'

const PORTFOLIO_SCOPE = 'PORTFOLIO'
const NAV_SERIES_TYPE = 'MODEL_NAV'
const JOB_LOCK_SCOPE = 'PORTFOLIO_JOB_LOCK'
const JOB_LOCK_KEY = 'GLOBAL'
const JOB_LOCK_TTL_MS = 30 * 60 * 1000

type AllocationItem = { asset: string; weight: number }
type PriceIngestSummary = {
  symbol: string
  requested: number
  inserted: number
  updated: number
  source: string
}

type RoiJobOptions = {
  portfolioKey?: string
  forceStartDate?: Date
  forceEndDate?: Date
  includeClean?: boolean
  trigger?: string
  requestedBy?: string
}

type JobContext = {
  runId: string
  trigger: string
  requestedBy?: string
}

function toUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function toDateKey(date: Date): string {
  return toUtcDate(date).toISOString().slice(0, 10)
}

function parseDateKey(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function listDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  let cursor = toUtcDate(startDate)
  const end = toUtcDate(endDate)
  while (cursor <= end) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

async function ingestPrices(
  tickers: string[],
  startDate: string,
  endDate: string,
  context: { portfolioKey: string; runId?: string; trigger?: string }
): Promise<PriceIngestSummary[]> {
  if (tickers.length === 0) return []
  const closesBySymbol = await getDailyCloses(tickers, startDate, endDate)
  const summaries: PriceIngestSummary[] = []

  for (const ticker of tickers) {
    const closes = closesBySymbol.get(ticker) ?? []
    if (closes.length === 0) {
      logger.error('No price data returned for ticker', undefined, {
        ticker,
        startDate,
        endDate
      })
      throw new Error(`No daily closes returned for ${ticker}`)
    }
    const source = ticker === 'CASHUSD' || ticker === 'USD' ? 'cash' : 'coingecko'
    const existingRows = await prisma.assetPriceDaily.findMany({
      where: {
        symbol: ticker,
        date: {
          gte: parseDateKey(startDate),
          lte: parseDateKey(endDate)
        }
      },
      select: { date: true }
    })
    const existingDates = new Set(existingRows.map((row) => toDateKey(row.date)))
    let inserted = 0
    let updated = 0

    for (const close of closes) {
      const date = parseDateKey(close.date)
      if (existingDates.has(close.date)) {
        updated += 1
      } else {
        inserted += 1
      }
      await prisma.assetPriceDaily.upsert({
        where: {
          symbol_date: {
            symbol: ticker,
            date
          }
        },
        update: {
          close: close.close,
          source
        },
        create: {
          symbol: ticker,
          date,
          close: close.close,
          source
        }
      })
    }

    const summary = {
      symbol: ticker,
      requested: closes.length,
      inserted,
      updated,
      source
    }
    summaries.push(summary)
    logger.info('Price ingest summary', {
      runId: context.runId ?? null,
      trigger: context.trigger ?? null,
      portfolioKey: context.portfolioKey,
      ticker,
      requested: summary.requested,
      inserted: summary.inserted,
      updated: summary.updated,
      source: summary.source,
      startDate,
      endDate
    })
  }

  return summaries
}

function buildPriceMap(rows: Array<{ date: Date; close: Decimal }>) {
  const map = new Map<string, Decimal>()
  for (const row of rows) {
    map.set(toDateKey(row.date), row.close as Decimal)
  }
  return map
}

function computePrimaryNavSeries(params: {
  dates: Date[]
  priceByDate: Map<string, Decimal>
  portfolioKey: string
  ticker: string
}) {
  const navSeries: Array<{ dateKey: string; nav: Decimal; dailyReturn: Decimal }> = []
  let nav = D(100)
  let initialized = false
  let prevPrice: Decimal | null = null
  let lastPrice: Decimal | null = null
  const missingDays: string[] = []

  for (const date of params.dates) {
    const dateKey = toDateKey(date)
    const priceForDate = params.priceByDate.get(dateKey)
    if (priceForDate) {
      lastPrice = priceForDate
    } else if (lastPrice) {
      missingDays.push(dateKey)
    }

    const price = priceForDate ?? lastPrice
    if (!price) {
      continue
    }

    if (!initialized) {
      initialized = true
      nav = D(100)
      navSeries.push({ dateKey, nav, dailyReturn: D(0) })
      prevPrice = price
      continue
    }

    if (!prevPrice) {
      prevPrice = price
      navSeries.push({ dateKey, nav, dailyReturn: D(0) })
      continue
    }

    const dailyReturn = D(price).div(prevPrice).minus(1)
    nav = nav.mul(D(1).add(dailyReturn))
    navSeries.push({ dateKey, nav, dailyReturn })
    prevPrice = price
  }

  if (missingDays.length > 0) {
    logger.warn('Missing daily closes for primary ticker; forward-filled', {
      portfolioKey: params.portfolioKey,
      ticker: params.ticker,
      missingDays: missingDays.slice(0, 5),
      missingCount: missingDays.length
    })
  }

  return navSeries
}

function computeMetrics(navSeries: Array<{ dateKey: string; nav: Decimal; dailyReturn: Decimal }>) {
  if (navSeries.length === 0) {
    return {
      roiInception: D(0),
      roi30d: D(0),
      maxDrawdown: D(0),
      volatility: D(0),
      asOfDate: null as Date | null
    }
  }

  const first = navSeries[0]
  const last = navSeries[navSeries.length - 1]
  const roiInception = last.nav.div(first.nav).minus(1).mul(100)

  const lastDate = parseDateKey(last.dateKey)
  const lookbackDate = addDays(lastDate, -30)
  const lookbackKey = toDateKey(lookbackDate)
  const lookbackPoint = navSeries.find((point) => point.dateKey >= lookbackKey) ?? first
  const roi30d = last.nav.div(lookbackPoint.nav).minus(1).mul(100)

  let peak = navSeries[0].nav
  let maxDrawdown = D(0)
  for (const point of navSeries) {
    if (point.nav.gt(peak)) {
      peak = point.nav
    }
    const drawdown = point.nav.div(peak).minus(1).mul(100)
    if (drawdown.lt(maxDrawdown)) {
      maxDrawdown = drawdown
    }
  }

  const returns = navSeries.map((point) => toNum(point.dailyReturn))
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length
  const stdDev = Math.sqrt(variance)
  const volatility = D(stdDev * Math.sqrt(365) * 100)

  return {
    roiInception,
    roi30d,
    maxDrawdown,
    volatility,
    asOfDate: parseDateKey(last.dateKey)
  }
}

function buildSignalWhere(portfolioKey: string): Prisma.PortfolioDailySignalWhereInput | null {
  const parsed = parsePortfolioKey(portfolioKey)
  if (!parsed) return null
  const riskProfile = parsed.riskProfile as RiskProfile

  if (parsed.tier === 'T1') {
    return {
      riskProfile,
      OR: [
        { tier: 'T1', category: null },
        { tier: 'T2', category: null }
      ]
    }
  }

  return {
    tier: 'T2',
    category: parsed.category,
    riskProfile
  }
}

function selectPrimarySymbolFromSignal(signal: { signal: string | null } | null) {
  if (!signal?.signal) return null
  const assets = parseAllocationAssets(signal.signal)
  return assets?.primaryAsset ?? null
}

function selectPrimarySymbolFromAllocation(items: AllocationItem[]) {
  if (items.length === 0) return null
  const sorted = [...items].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
  return sorted[0]?.asset ?? null
}

function parsePayload(payload: string | null | undefined): Record<string, unknown> {
  if (!payload) return {}
  try {
    const parsed = JSON.parse(payload)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function buildPayload(existing: string | null | undefined, updates: Record<string, unknown>) {
  const current = parsePayload(existing)
  return JSON.stringify({ ...current, ...updates })
}

async function markSnapshotError(params: {
  snapshot: { id: string; payload: string; needsRecompute: boolean }
  portfolioKey: string
  message: string
  primarySymbol?: string | null
  primaryTicker?: string | null
  primarySource?: string | null
  terminal?: boolean
}) {
  const payload = buildPayload(params.snapshot.payload, {
    lastError: params.message,
    primarySymbol: params.primarySymbol ?? null,
    primaryTicker: params.primaryTicker ?? null,
    primarySource: params.primarySource ?? null
  })

  await prisma.roiDashboardSnapshot.update({
    where: { id: params.snapshot.id },
    data: {
      ...(params.terminal ? { needsRecompute: false } : {}),
      lastComputedAt: new Date(),
      payload
    }
  })

  logger.warn('Portfolio ROI recompute skipped', {
    portfolioKey: params.portfolioKey,
    reason: params.message,
    terminal: params.terminal ?? false
  })
}

async function acquireJobLock(context: JobContext) {
  const now = new Date()
  const holder = process.env.VERCEL_REGION || process.env.HOSTNAME || 'local'
  const payload = {
    runId: context.runId,
    trigger: context.trigger,
    requestedBy: context.requestedBy ?? null,
    holder,
    lockedAt: now.toISOString()
  }
  try {
    await prisma.roiDashboardSnapshot.create({
      data: {
        scope: JOB_LOCK_SCOPE,
        portfolioKey: JOB_LOCK_KEY,
        cacheKey: JOB_LOCK_KEY,
        payload: JSON.stringify(payload)
      }
    })
    logger.info('Portfolio ROI job lock acquired', {
      runId: context.runId,
      trigger: context.trigger,
      holder
    })
    return true
  } catch (error: any) {
    if (error?.code !== 'P2002') {
      logger.error('Failed to acquire ROI job lock', error instanceof Error ? error : new Error(String(error)))
      return false
    }
  }

  const existing = await prisma.roiDashboardSnapshot.findUnique({
    where: {
      scope_portfolioKey: {
        scope: JOB_LOCK_SCOPE,
        portfolioKey: JOB_LOCK_KEY
      }
    }
  })
  const existingPayload = existing?.payload ? JSON.parse(existing.payload) as Record<string, any> : null
  const existingHolder = existingPayload?.holder ?? 'unknown'
  const existingRunId = existingPayload?.runId ?? 'unknown'
  const existingLockedAt = existingPayload?.lockedAt ?? null

  const staleBefore = new Date(now.getTime() - JOB_LOCK_TTL_MS)
  if (existing && existing.updatedAt < staleBefore) {
    await prisma.roiDashboardSnapshot.update({
      where: { id: existing.id },
      data: {
        payload: JSON.stringify({ ...payload, stolen: true, previousRunId: existingRunId })
      }
    })
    logger.warn('Portfolio ROI job lock was stale and has been stolen', {
      runId: context.runId,
      previousRunId: existingRunId,
      previousHolder: existingHolder,
      previousLockedAt: existingLockedAt
    })
    return true
  }

  logger.warn('Portfolio ROI job lock is currently held', {
    runId: context.runId,
    currentRunId: existingRunId,
    currentHolder: existingHolder,
    lockedAt: existingLockedAt
  })
  return false
}

async function releaseJobLock() {
  await prisma.roiDashboardSnapshot.deleteMany({
    where: { scope: JOB_LOCK_SCOPE, portfolioKey: JOB_LOCK_KEY }
  })
  logger.info('Portfolio ROI job lock released')
}

export async function runPortfolioRoiJob(options: RoiJobOptions = {}) {
  const context: JobContext = {
    runId: randomUUID(),
    trigger: options.trigger ?? 'cron',
    requestedBy: options.requestedBy
  }
  logger.info('Portfolio ROI job starting', {
    runId: context.runId,
    trigger: context.trigger,
    portfolioKey: options.portfolioKey ?? null,
    forceStartDate: options.forceStartDate ? toDateKey(options.forceStartDate) : null,
    forceEndDate: options.forceEndDate ? toDateKey(options.forceEndDate) : null
  })
  if (!process.env.COINGECKO_API_KEY) {
    logger.warn('COINGECKO_API_KEY is not set; provider may be rate-limited')
  }
  const lockAcquired = await acquireJobLock(context)
  if (!lockAcquired) {
    return { processed: 0, skipped: 'locked', runId: context.runId }
  }

  try {
    const dirtyPortfolios = await prisma.roiDashboardSnapshot.findMany({
      where: {
        scope: PORTFOLIO_SCOPE,
        ...(options.portfolioKey ? { portfolioKey: options.portfolioKey } : {}),
        ...(options.includeClean ? {} : { needsRecompute: true })
      },
      orderBy: { updatedAt: 'asc' }
    })

    if (dirtyPortfolios.length === 0) {
      logger.info('Portfolio ROI job found no dirty portfolios', {
        runId: context.runId,
        trigger: context.trigger
      })
      return { processed: 0 }
    }

    logger.info('Portfolio ROI job found dirty portfolios', {
      runId: context.runId,
      trigger: context.trigger,
      count: dirtyPortfolios.length,
      portfolioKeys: dirtyPortfolios.map((snapshot) => snapshot.portfolioKey).filter(Boolean)
    })

    for (const snapshot of dirtyPortfolios) {
      if (!snapshot.portfolioKey) {
        continue
      }

      const portfolioKey = snapshot.portfolioKey
      try {
        const signalWhere = buildSignalWhere(portfolioKey)
        const [allocations, latestSignal] = await Promise.all([
          prisma.allocationSnapshot.findMany({
            where: { portfolioKey },
            orderBy: { asOfDate: 'asc' }
          }),
          signalWhere
            ? prisma.portfolioDailySignal.findFirst({
                where: signalWhere,
                orderBy: { publishedAt: 'desc' }
              })
            : Promise.resolve(null)
        ])

        const latestAllocation = allocations.length > 0 ? allocations[allocations.length - 1] : null
        const allocationItems = (Array.isArray(latestAllocation?.items) ? latestAllocation?.items : [])
          .map((item: any) => ({
            asset: String(item?.asset ?? ''),
            weight: Number(item?.weight ?? 0)
          }))

        const primaryFromSignal = selectPrimarySymbolFromSignal(latestSignal)
        const primaryFromAllocation = selectPrimarySymbolFromAllocation(allocationItems)
        const primarySource = primaryFromSignal ? 'signal' : (primaryFromAllocation ? 'allocation' : null)
        const primarySymbol = normalizeAssetSymbol(primaryFromSignal ?? primaryFromAllocation)

        if (!primarySymbol) {
          await markSnapshotError({
            snapshot,
            portfolioKey,
            message: 'Primary asset missing for portfolioKey',
            terminal: true
          })
          continue
        }

        const primaryTicker = getPrimaryTicker(primarySymbol)
        if (!primaryTicker) {
          await markSnapshotError({
            snapshot,
            portfolioKey,
            message: `Primary ticker mapping missing for ${primarySymbol}`,
            primarySymbol,
            primarySource,
            terminal: true
          })
          continue
        }

        const baselineDate = allocations.length > 0
          ? toUtcDate(allocations[0].asOfDate)
          : (latestSignal ? toUtcDate(latestSignal.publishedAt) : null)

        if (!baselineDate) {
          await markSnapshotError({
            snapshot,
            portfolioKey,
            message: 'No baseline date available for primary ROI computation',
            primarySymbol,
            primaryTicker,
            primarySource,
            terminal: true
          })
          continue
        }

        const existingPayload = parsePayload(snapshot.payload)
        const previousTicker = typeof existingPayload.primaryTicker === 'string' ? existingPayload.primaryTicker : null
        const previousMode = typeof existingPayload.primaryMode === 'string' ? existingPayload.primaryMode : null
        const primaryChanged = previousTicker !== primaryTicker || previousMode !== 'primary-only'

        const recomputeFrom = options.forceStartDate
          ? toUtcDate(options.forceStartDate)
          : (snapshot.recomputeFromDate ? toUtcDate(snapshot.recomputeFromDate) : baselineDate)
        const startDate = primaryChanged ? baselineDate : recomputeFrom
        const endDate = options.forceEndDate ? toUtcDate(options.forceEndDate) : toUtcDate(new Date())
        const priceStartDate = addDays(startDate, -2)

        if (startDate > endDate) {
          await markSnapshotError({
            snapshot,
            portfolioKey,
            message: 'Recompute start date is after end date',
            primarySymbol,
            primaryTicker,
            primarySource
          })
          continue
        }

        logger.info('Portfolio ROI recompute context', {
          runId: context.runId,
          portfolioKey,
          needsRecompute: snapshot.needsRecompute,
          recomputeFromDate: snapshot.recomputeFromDate ? toDateKey(snapshot.recomputeFromDate) : null,
          lastComputedAt: snapshot.lastComputedAt?.toISOString() ?? null,
          asOfDate: snapshot.asOfDate ? toDateKey(snapshot.asOfDate) : null,
          latestSignalDate: latestSignal ? toDateKey(latestSignal.publishedAt) : null,
          latestAllocationDate: latestAllocation ? toDateKey(latestAllocation.asOfDate) : null,
          primarySymbol,
          primaryTicker,
          primarySource,
          primaryChanged,
          allocationCount: allocationItems.length,
          allocations: allocationItems,
          startDate: toDateKey(startDate),
          endDate: toDateKey(endDate),
          priceStartDate: toDateKey(priceStartDate)
        })

        try {
          await ingestPrices([primaryTicker], toDateKey(priceStartDate), toDateKey(endDate), {
            portfolioKey,
            runId: context.runId,
            trigger: context.trigger
          })
        } catch (error) {
          logger.error(
            'Price ingest failed for portfolio key',
            error instanceof Error ? error : new Error(String(error)),
            {
              portfolioKey,
              primaryTicker
            }
          )
          await markSnapshotError({
            snapshot,
            portfolioKey,
            message: 'Price ingestion failed for primary ticker',
            primarySymbol,
            primaryTicker,
            primarySource
          })
          continue
        }

        const priceRows = await prisma.assetPriceDaily.findMany({
          where: {
            symbol: primaryTicker,
            date: {
              gte: priceStartDate,
              lte: endDate
            }
          },
          orderBy: { date: 'asc' }
        })

        if (priceRows.length === 0) {
          await markSnapshotError({
            snapshot,
            portfolioKey,
            message: `No price rows stored for ${primaryTicker}`,
            primarySymbol,
            primaryTicker,
            primarySource
          })
          continue
        }

        const dateRange = listDates(startDate, endDate)
        const priceByDate = buildPriceMap(priceRows)
        const navSeries = computePrimaryNavSeries({
          dates: dateRange,
          priceByDate,
          portfolioKey,
          ticker: primaryTicker
        })

        if (navSeries.length === 0) {
          await markSnapshotError({
            snapshot,
            portfolioKey,
            message: `No NAV series computed for ${primaryTicker}`,
            primarySymbol,
            primaryTicker,
            primarySource
          })
          continue
        }

        await prisma.$transaction(
          navSeries.map((point) =>
            prisma.performanceSeries.upsert({
              where: {
                seriesType_date_portfolioKey: {
                  seriesType: NAV_SERIES_TYPE,
                  date: parseDateKey(point.dateKey),
                  portfolioKey
                }
              },
              update: { value: point.nav },
              create: {
                seriesType: NAV_SERIES_TYPE,
                date: parseDateKey(point.dateKey),
                portfolioKey,
                value: point.nav
              }
            })
          )
        )

        logger.info('NAV series computed', {
          runId: context.runId,
          portfolioKey,
          primaryTicker,
          computedDays: navSeries.length,
          writtenRows: navSeries.length
        })

        const metrics = computeMetrics(navSeries)
        const lastPriceDate = priceRows[priceRows.length - 1]?.date ?? null
        const payload = buildPayload(snapshot.payload, {
          primarySymbol,
          primaryTicker,
          primarySource,
          lastPriceDate: lastPriceDate ? toDateKey(lastPriceDate) : null,
          lastError: null,
          primaryMode: 'primary-only'
        })

        await prisma.roiDashboardSnapshot.update({
          where: { id: snapshot.id },
          data: {
            needsRecompute: false,
            recomputeFromDate: null,
            asOfDate: metrics.asOfDate,
            roiInception: metrics.roiInception,
            roi30d: metrics.roi30d,
            maxDrawdown: metrics.maxDrawdown,
            volatility: metrics.volatility,
            lastComputedAt: new Date(),
            payload
          }
        })
      } catch (error) {
        logger.error(
          'Portfolio ROI recompute failed',
          error instanceof Error ? error : new Error(String(error)),
          {
            portfolioKey
          }
        )
        continue
      }
    }

    logger.info('Portfolio ROI job finished', {
      runId: context.runId,
      trigger: context.trigger,
      processed: dirtyPortfolios.length
    })
    return { processed: dirtyPortfolios.length, runId: context.runId }
  } finally {
    await releaseJobLock()
  }
}
