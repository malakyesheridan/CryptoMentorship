import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { toNum } from '@/lib/num/dec'
import { parseAllocationAssets } from '@/lib/portfolio-assets'
import { buildPortfolioKey, parsePortfolioKey } from '@/lib/portfolio/portfolio-key'
import { getPrimaryTicker, normalizeAssetSymbol } from '@/lib/prices/tickers'
import { runPortfolioRoiJob } from '@/lib/jobs/portfolio-roi'
import { Prisma, RiskProfile } from '@prisma/client'

const NAV_SERIES_TYPE = 'MODEL_NAV'
const PRICE_STALE_DAYS = 2
export const dynamic = 'force-dynamic'

const RANGE_DAYS: Record<string, number | null> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  all: null
}

function toDateKey(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

function dateKeyToDate(dateKey: string | null) {
  if (!dateKey) return null
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseTierFromPortfolioKey(portfolioKey: string): 'T1' | 'T2' | null {
  const tier = portfolioKey.split('_')[0]?.toLowerCase()
  if (tier === 't1') return 'T1'
  if (tier === 't2') return 'T2'
  return null
}

async function getUserTier(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { tier: true, status: true }
  })
  const isActive = (membership?.status === 'active' || membership?.status === 'trial')
  return { tier: membership?.tier ?? null, isActive }
}

async function getDefaultPortfolioKey(userTier: string | null, requestedTier?: 'T1' | 'T2' | null) {
  const preferredTier = requestedTier ?? (userTier === 'T2' ? 'T2' : 'T1')
  const preferredCategory = preferredTier === 'T2' ? 'majors' : null

  const signal = await prisma.portfolioDailySignal.findFirst({
    where: preferredTier === 'T2'
      ? { tier: 'T2', category: preferredCategory }
      : {
          OR: [
            { tier: 'T1', category: null },
            { tier: 'T2', category: null }
          ]
        },
    orderBy: { publishedAt: 'desc' }
  })

  const fallbackRiskProfile = 'CONSERVATIVE'
  return buildPortfolioKey({
    tier: preferredTier,
    category: preferredTier === 'T2' ? preferredCategory : 'majors',
    riskProfile: signal?.riskProfile ?? fallbackRiskProfile
  })
}

function buildSignalWhere(portfolioKey: string): Prisma.PortfolioDailySignalWhereInput | null {
  const parsed = parsePortfolioKey(portfolioKey)
  if (!parsed) return null
  const riskProfile = parsed.riskProfile as RiskProfile

  return parsed.tier === 'T1'
    ? {
        riskProfile,
        OR: [
          { tier: 'T1', category: null },
          { tier: 'T2', category: null }
        ]
      }
    : {
        tier: 'T2',
        category: parsed.category,
        riskProfile
      }
}

async function getLatestSignal(portfolioKey: string) {
  const where = buildSignalWhere(portfolioKey)
  if (!where) return null

  return prisma.portfolioDailySignal.findFirst({
    where,
    orderBy: { publishedAt: 'desc' }
  })
}

function selectPrimarySymbolFromAllocation(items: Array<{ asset: string; weight: number }>) {
  if (items.length === 0) return null
  const sorted = [...items].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
  return sorted[0]?.asset ?? null
}

function parseSnapshotPayload(payload: string | null | undefined) {
  if (!payload) return {}
  try {
    const parsed = JSON.parse(payload)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function parsePrimaryFromSignal(signal: string | null | undefined) {
  if (!signal) return { symbol: null, ticker: null }
  const primary = parseAllocationAssets(signal)?.primaryAsset ?? null
  const symbol = normalizeAssetSymbol(primary)
  return { symbol, ticker: symbol ? getPrimaryTicker(symbol) : null }
}

function buildPrimaryHistory(params: {
  navRows: Array<{ date: Date }>
  signals: Array<{ publishedAt: Date; signal: string }>
}) {
  const history: Array<{ date: string; primarySymbol: string | null; primaryTicker: string | null }> = []
  if (params.navRows.length === 0) return history

  const signals = [...params.signals].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime())
  let cursor = 0
  let currentSymbol: string | null = null
  let currentTicker: string | null = null

  for (const row of params.navRows) {
    const dateKey = toDateKey(row.date)
    while (cursor < signals.length && toDateKey(signals[cursor].publishedAt) <= dateKey) {
      const parsed = parsePrimaryFromSignal(signals[cursor].signal)
      if (parsed.symbol) {
        currentSymbol = parsed.symbol
        currentTicker = parsed.ticker
      }
      cursor += 1
    }
    history.push({ date: dateKey, primarySymbol: currentSymbol, primaryTicker: currentTicker })
  }

  return history
}

function canAccessPortfolioKey(userTier: string | null, portfolioKey: string, isActive: boolean, userRole?: string) {
  if (userRole === 'admin') return true
  if (!userTier || !isActive) return false
  const portfolioTier = parseTierFromPortfolioKey(portfolioKey)
  if (!portfolioTier) return false
  const tierOrder = { T1: 1, T2: 2 }
  return tierOrder[userTier as 'T1' | 'T2'] >= tierOrder[portfolioTier]
}

function computeKpisFromNav(navSeries: Array<{ date: string; nav: number }>) {
  if (navSeries.length === 0) {
    return { roi_inception: null, roi_30d: null, max_drawdown: null, as_of_date: null }
  }

  const first = navSeries[0].nav
  const last = navSeries[navSeries.length - 1].nav
  const roi_inception = first > 0 ? ((last / first) - 1) * 100 : null

  const lastDate = new Date(`${navSeries[navSeries.length - 1].date}T00:00:00.000Z`)
  const lookback = new Date(lastDate)
  lookback.setUTCDate(lookback.getUTCDate() - 30)
  const lookbackPoint = navSeries.find((point) => new Date(`${point.date}T00:00:00.000Z`) >= lookback) ?? navSeries[0]
  const roi_30d = lookbackPoint.nav > 0 ? ((last / lookbackPoint.nav) - 1) * 100 : null

  let peak = navSeries[0].nav
  let max_drawdown = 0
  for (const point of navSeries) {
    if (point.nav > peak) {
      peak = point.nav
    }
    const drawdown = ((point.nav / peak) - 1) * 100
    if (drawdown < max_drawdown) {
      max_drawdown = drawdown
    }
  }

  return {
    roi_inception,
    roi_30d,
    max_drawdown,
    as_of_date: navSeries[navSeries.length - 1].date
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tier: userTier, isActive } = await getUserTier(session.user.id)
    const effectiveTier = session.user.role === 'admin' ? 'T2' : userTier
    const { searchParams } = new URL(request.url)
    const rangeParam = searchParams.get('range')?.toLowerCase() ?? '1y'
    const requestedKey = searchParams.get('portfolioKey')
    const requestedTierRaw = searchParams.get('tier')?.toUpperCase()
    const requestedTier = requestedTierRaw === 'T1' || requestedTierRaw === 'T2' ? requestedTierRaw : null
    const portfolioKey = (requestedKey ?? (await getDefaultPortfolioKey(effectiveTier, requestedTier))).toLowerCase()

    if (!canAccessPortfolioKey(effectiveTier, portfolioKey, isActive, session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [latestPoint, snapshot, lastRebalance, latestSignal] = await Promise.all([
      prisma.performanceSeries.findFirst({
        where: { seriesType: NAV_SERIES_TYPE, portfolioKey },
        orderBy: { date: 'desc' }
      }),
      prisma.roiDashboardSnapshot.findUnique({
        where: {
          scope_portfolioKey: {
            scope: 'PORTFOLIO',
            portfolioKey
          }
        }
      }),
      prisma.allocationSnapshot.findFirst({
        where: { portfolioKey },
        orderBy: { asOfDate: 'desc' }
      }),
      getLatestSignal(portfolioKey)
    ])

    const allocationItems = Array.isArray(lastRebalance?.items) ? lastRebalance?.items : []
    const allocationCandidates = allocationItems
      .map((item: any) => ({
        asset: String(item?.asset ?? ''),
        weight: Number(item?.weight ?? 0)
      }))

    const primaryFromSignal = latestSignal ? parseAllocationAssets(latestSignal.signal)?.primaryAsset ?? null : null
    const primaryFromAllocation = selectPrimarySymbolFromAllocation(allocationCandidates)
    const primarySymbol = normalizeAssetSymbol(primaryFromSignal ?? primaryFromAllocation)
    const primaryTicker = primarySymbol ? getPrimaryTicker(primarySymbol) : null

    const lastSignalDateKey = latestSignal?.publishedAt ? toDateKey(latestSignal.publishedAt) : null
    const lastPriceRow = primaryTicker
      ? await prisma.assetPriceDaily.findFirst({
          where: { symbol: primaryTicker },
          orderBy: { date: 'desc' }
        })
      : null

    const lastPriceDate = lastPriceRow?.date ?? null
    const signalPriceRow = primaryTicker && lastSignalDateKey
      ? await prisma.assetPriceDaily.findFirst({
          where: {
            symbol: primaryTicker,
            date: {
              lte: new Date(`${lastSignalDateKey}T00:00:00.000Z`)
            }
          },
          orderBy: { date: 'desc' }
        })
      : null

    const latestPriceValue = lastPriceRow?.close !== null && lastPriceRow?.close !== undefined
      ? toNum(lastPriceRow.close)
      : null
    const signalPriceValue = signalPriceRow?.close !== null && signalPriceRow?.close !== undefined
      ? toNum(signalPriceRow.close)
      : null
    const primaryMove = latestPriceValue !== null && signalPriceValue !== null
      ? {
          percent: ((latestPriceValue / signalPriceValue) - 1) * 100,
          fromDate: signalPriceRow ? toDateKey(signalPriceRow.date) : null,
          toDate: lastPriceRow ? toDateKey(lastPriceRow.date) : null
        }
      : null

    const rangeDays = RANGE_DAYS[rangeParam] ?? RANGE_DAYS['1y']
    const latestDate = latestPoint?.date ?? null
    const startDate = rangeDays === null
      ? null
      : new Date(Date.UTC(
          latestDate?.getUTCFullYear() ?? new Date().getUTCFullYear(),
          latestDate?.getUTCMonth() ?? new Date().getUTCMonth(),
          (latestDate?.getUTCDate() ?? new Date().getUTCDate()) - rangeDays
        ))

    const navRows = await prisma.performanceSeries.findMany({
      where: {
        seriesType: NAV_SERIES_TYPE,
        portfolioKey,
        ...(startDate ? { date: { gte: startDate } } : {})
      },
      orderBy: { date: 'asc' }
    })

    const navSeries = navRows.map((row) => ({
      date: toDateKey(row.date),
      nav: toNum(row.value)
    }))

    const signalWhere = buildSignalWhere(portfolioKey)
    const signalHistory = navRows.length > 0 && signalWhere
      ? await prisma.portfolioDailySignal.findMany({
          where: {
            ...signalWhere,
            publishedAt: {
              lte: new Date(Date.UTC(
                navRows[navRows.length - 1].date.getUTCFullYear(),
                navRows[navRows.length - 1].date.getUTCMonth(),
                navRows[navRows.length - 1].date.getUTCDate(),
                23,
                59,
                59,
                999
              ))
            }
          },
          orderBy: { publishedAt: 'asc' },
          select: { publishedAt: true, signal: true }
        })
      : []
    const primaryHistory = buildPrimaryHistory({ navRows, signals: signalHistory })
    const primaryTickers = Array.from(
      new Set(primaryHistory.map((entry) => entry.primaryTicker).filter((value): value is string => !!value))
    )
    const primaryPriceRows = navRows.length > 0 && primaryTickers.length > 0
      ? await prisma.assetPriceDaily.findMany({
          where: {
            symbol: { in: primaryTickers },
            date: {
              gte: navRows[0].date,
              lte: navRows[navRows.length - 1].date
            }
          },
          select: { symbol: true, date: true, close: true }
        })
      : []
    const primaryPriceMap = new Map<string, number>()
    for (const row of primaryPriceRows) {
      primaryPriceMap.set(`${row.symbol}|${toDateKey(row.date)}`, toNum(row.close))
    }
    const primaryPrices = primaryHistory.map((entry) => {
      const ticker = entry.primaryTicker ?? null
      const key = ticker ? `${ticker}|${entry.date}` : null
      const close = key ? (primaryPriceMap.get(key) ?? null) : null
      return {
        date: entry.date,
        ticker,
        close
      }
    })

    const kpis = snapshot
      ? {
          roi_inception: snapshot.roiInception !== null ? toNum(snapshot.roiInception) : null,
          roi_30d: snapshot.roi30d !== null ? toNum(snapshot.roi30d) : null,
          max_drawdown: snapshot.maxDrawdown !== null ? toNum(snapshot.maxDrawdown) : null,
          as_of_date: snapshot.asOfDate ? toDateKey(snapshot.asOfDate) : null
        }
      : computeKpisFromNav(navSeries)

    const lastPriceDateKey = lastPriceDate ? toDateKey(lastPriceDate) : null
    const asOfDate = kpis?.as_of_date ?? null
    const asOfDateValue = dateKeyToDate(asOfDate)
    const lastSignalValue = dateKeyToDate(lastSignalDateKey)
    const lastPriceValue = dateKeyToDate(lastPriceDateKey)
    const todayKey = toDateKey(new Date())
    const todayValue = dateKeyToDate(todayKey)
    const priceStaleCutoff = todayValue ? new Date(todayValue.getTime()) : null
    if (priceStaleCutoff) {
      priceStaleCutoff.setUTCDate(priceStaleCutoff.getUTCDate() - PRICE_STALE_DAYS)
    }

    const hasNav = navSeries.length > 0
    const needsRecompute = snapshot?.needsRecompute ?? false
    const signalAhead = !!(lastSignalValue && asOfDateValue && asOfDateValue < lastSignalValue)
    const priceStale = !!(lastPriceValue && priceStaleCutoff && lastPriceValue < priceStaleCutoff)
    const missingPrices = !!primaryTicker && !lastPriceValue
    const isStale = signalAhead || priceStale || missingPrices
    const awaitingData = !!lastSignalValue || !!lastRebalance
    const payload = parseSnapshotPayload(snapshot?.payload)
    const lastError = typeof payload.lastError === 'string' ? payload.lastError : null
    const lastKickAt = typeof payload.lastKickAt === 'string' ? payload.lastKickAt : null

    let status: 'ok' | 'updating' | 'stale' | 'error' = 'ok'
    let statusReason: string | null = null
    if (needsRecompute) {
      status = 'updating'
      statusReason = 'Recompute pending'
    } else if (!hasNav) {
      status = lastError ? 'error' : (awaitingData ? 'updating' : 'error')
      statusReason = awaitingData ? 'Awaiting first NAV calculation' : null
    } else if (isStale) {
      status = 'stale'
      if (signalAhead) {
        statusReason = 'Update posted after last NAV date'
      } else if (priceStale || missingPrices) {
        statusReason = 'Price data lagging for primary ticker'
      }
    }

    const shouldKick = !!snapshot?.portfolioKey && (status === 'updating' || status === 'stale')
    if (shouldKick) {
      const now = new Date()
      const lastKick = lastKickAt ? new Date(lastKickAt) : null
      const kickStale = !lastKick || (now.getTime() - lastKick.getTime()) > 5 * 60 * 1000
      if (kickStale && snapshot?.portfolioKey) {
        void runPortfolioRoiJob({
          portfolioKey: snapshot.portfolioKey,
          includeClean: true,
          trigger: 'roi-api'
        }).catch(() => undefined)
        await prisma.roiDashboardSnapshot.update({
          where: {
            scope_portfolioKey: {
              scope: 'PORTFOLIO',
              portfolioKey: snapshot.portfolioKey
            }
          },
          data: {
            payload: JSON.stringify({ ...payload, lastKickAt: now.toISOString() })
          }
        })
      }
    }

    return NextResponse.json({
      portfolioKey,
      status,
      needsRecompute,
      asOfDate,
      lastComputedAt: snapshot?.lastComputedAt ? snapshot.lastComputedAt.toISOString() : null,
      lastSignalDate: lastSignalDateKey,
      lastPriceDate: lastPriceDateKey,
      primarySymbol,
      primaryTicker,
      primaryPrices,
      statusReason,
      primaryMove,
      lastError,
      primaryHistory,
      navSeries,
      kpis,
      lastRebalance: lastRebalance
        ? {
            effective_date: toDateKey(lastRebalance.asOfDate),
            allocations: Array.isArray(lastRebalance.items) ? lastRebalance.items : []
          }
        : null
    })
  } catch (error) {
    console.error('Error fetching portfolio ROI:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
