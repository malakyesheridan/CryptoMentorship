import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { toNum } from '@/lib/num/dec'
import { parseAllocationAssets } from '@/lib/portfolio-assets'
import { parsePortfolioKey } from '@/lib/portfolio/portfolio-key'

const NAV_SERIES_TYPE = 'MODEL_NAV'

function toDateKey(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

function buildSignalWhere(portfolioKey: string) {
  const parsed = parsePortfolioKey(portfolioKey)
  if (!parsed) return null

  if (parsed.tier === 'T1') {
    return {
      riskProfile: parsed.riskProfile,
      OR: [
        { tier: 'T1', category: null },
        { tier: 'T2', category: null }
      ]
    }
  }

  return {
    tier: 'T2',
    category: parsed.category,
    riskProfile: parsed.riskProfile
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireRoleAPI(['admin'])

    const { searchParams } = new URL(request.url)
    const portfolioKey = searchParams.get('portfolioKey')?.toLowerCase()

    if (!portfolioKey) {
      return NextResponse.json({ error: 'portfolioKey is required' }, { status: 400 })
    }

    const signalWhere = buildSignalWhere(portfolioKey)

    const [latestSignal, latestAllocation, latestNav, snapshot] = await Promise.all([
      signalWhere
        ? prisma.portfolioDailySignal.findFirst({
            where: signalWhere,
            orderBy: { publishedAt: 'desc' }
          })
        : Promise.resolve(null),
      prisma.allocationSnapshot.findFirst({
        where: { portfolioKey },
        orderBy: { asOfDate: 'desc' }
      }),
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
      })
    ])

    const allocationItems = Array.isArray(latestAllocation?.items) ? latestAllocation?.items : []
    const allocationSymbols = Array.from(new Set(
      allocationItems
        .map((item: any) => String(item.asset ?? '').trim().toUpperCase())
        .filter((symbol) => symbol.length > 0)
    ))

    const priceMeta = allocationSymbols.length > 0
      ? await prisma.assetPriceDaily.groupBy({
          by: ['symbol'],
          _max: { date: true },
          where: { symbol: { in: allocationSymbols } }
        })
      : []

    return NextResponse.json({
      portfolioKey,
      latestSignal: latestSignal
        ? {
            date: toDateKey(latestSignal.publishedAt),
            tier: latestSignal.tier,
            category: latestSignal.category,
            riskProfile: latestSignal.riskProfile,
            assets: parseAllocationAssets(latestSignal.signal)
          }
        : null,
      latestAllocation: latestAllocation
        ? {
            asOfDate: toDateKey(latestAllocation.asOfDate),
            allocations: allocationItems
          }
        : null,
      latestNav: latestNav
        ? {
            date: toDateKey(latestNav.date),
            nav: toNum(latestNav.value)
          }
        : null,
      latestPriceDates: priceMeta.map((entry) => ({
        symbol: entry.symbol,
        date: entry._max.date ? toDateKey(entry._max.date) : null
      })),
      snapshot: snapshot
        ? {
            needsRecompute: snapshot.needsRecompute,
            recomputeFromDate: snapshot.recomputeFromDate ? toDateKey(snapshot.recomputeFromDate) : null,
            asOfDate: snapshot.asOfDate ? toDateKey(snapshot.asOfDate) : null,
            lastComputedAt: snapshot.lastComputedAt ? snapshot.lastComputedAt.toISOString() : null
          }
        : null,
      providerConfig: {
        coingeckoApiKeyPresent: !!process.env.COINGECKO_API_KEY
      }
    })
  } catch (error: any) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to load diagnostics.' }, { status: 500 })
  }
}
