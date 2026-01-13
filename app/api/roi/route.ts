import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { toNum } from '@/lib/num/dec'
import { buildPortfolioKey } from '@/lib/portfolio/portfolio-key'

const NAV_SERIES_TYPE = 'MODEL_NAV'

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

async function getDefaultPortfolioKey(userTier: string | null) {
  const preferredTier = userTier === 'T2' ? 'T2' : 'T1'
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
    const portfolioKey = (requestedKey ?? (await getDefaultPortfolioKey(effectiveTier))).toLowerCase()

    if (!canAccessPortfolioKey(effectiveTier, portfolioKey, isActive, session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const latestPoint = await prisma.performanceSeries.findFirst({
      where: { seriesType: NAV_SERIES_TYPE, portfolioKey },
      orderBy: { date: 'desc' }
    })

    if (!latestPoint) {
      return NextResponse.json({
        portfolioKey,
        navSeries: [],
        kpis: null,
        lastRebalance: null
      })
    }

    const rangeDays = RANGE_DAYS[rangeParam] ?? RANGE_DAYS['1y']
    const latestDate = latestPoint.date
    const startDate = rangeDays === null
      ? null
      : new Date(Date.UTC(
          latestDate.getUTCFullYear(),
          latestDate.getUTCMonth(),
          latestDate.getUTCDate() - rangeDays
        ))

    const navRows = await prisma.performanceSeries.findMany({
      where: {
        seriesType: NAV_SERIES_TYPE,
        portfolioKey,
        ...(startDate ? { date: { gte: startDate } } : {})
      },
      orderBy: { date: 'asc' }
    })

    const snapshot = await prisma.roiDashboardSnapshot.findUnique({
      where: {
        scope_portfolioKey: {
          scope: 'PORTFOLIO',
          portfolioKey
        }
      }
    })

    const lastRebalance = await prisma.allocationSnapshot.findFirst({
      where: { portfolioKey },
      orderBy: { asOfDate: 'desc' }
    })

    const navSeries = navRows.map((row) => ({
      date: toDateKey(row.date),
      nav: toNum(row.value)
    }))

    const kpis = snapshot
      ? {
          roi_inception: snapshot.roiInception !== null ? toNum(snapshot.roiInception) : null,
          roi_30d: snapshot.roi30d !== null ? toNum(snapshot.roi30d) : null,
          max_drawdown: snapshot.maxDrawdown !== null ? toNum(snapshot.maxDrawdown) : null,
          as_of_date: snapshot.asOfDate ? toDateKey(snapshot.asOfDate) : null
        }
      : computeKpisFromNav(navSeries)

    return NextResponse.json({
      portfolioKey,
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
