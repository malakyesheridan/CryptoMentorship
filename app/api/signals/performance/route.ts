import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { 
  buildEquityCurve, 
  calculatePerformanceStats, 
  calculateMonthlyReturns,
  computeHash,
  filterTradesByScope,
  serializePerformanceData,
  deserializePerformanceData,
  isCacheValid,
  PerformanceScope,
  CachedPerformanceData
} from '@/lib/perf'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scope = (searchParams.get('scope') || 'ALL') as PerformanceScope
    const refresh = searchParams.get('refresh') === '1'

    // Get portfolio settings
    const settings = await prisma.portfolioSetting.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!settings) {
      return NextResponse.json({ error: 'Portfolio settings not found' }, { status: 404 })
    }

    // Get all trades
    const allTrades = await prisma.signalTrade.findMany({
      orderBy: { entryTime: 'asc' }
    })

    // Filter trades by scope
    const filteredTrades = filterTradesByScope(allTrades as any, scope)

    // Check cache first (unless refresh is requested)
    if (!refresh) {
      const cacheKey = computeHash(filteredTrades, settings as any)
      const cachedSnapshot = await prisma.perfSnapshot.findFirst({
        where: {
          scope,
          hash: cacheKey
        },
        orderBy: { createdAt: 'desc' }
      })

      if (cachedSnapshot && isCacheValid(cachedSnapshot.createdAt)) {
        const cachedData = deserializePerformanceData(cachedSnapshot.payload)
        return NextResponse.json({
          success: true,
          cached: true,
          scope,
          data: cachedData
        })
      }
    }

    // Compute performance data
    const equitySeries = buildEquityCurve(filteredTrades, settings as any)
    const stats = calculatePerformanceStats(filteredTrades, equitySeries, settings.baseCapitalUsd)
    // Calculate monthly returns from equity series
    const monthlyReturns = calculateMonthlyReturns(equitySeries)

    const performanceData: CachedPerformanceData = {
      stats,
      equitySeries,
      drawdownSeries: equitySeries.map(point => ({
        date: point.date,
        equity: point.equity,
        drawdown: point.drawdown,
        trades: point.trades
      })),
      monthlyReturns,
      tradeStats: {
        totalTrades: filteredTrades.length,
        closedTrades: filteredTrades.filter(t => t.status === 'closed').length,
        openTrades: filteredTrades.filter(t => t.status === 'open').length,
        avgHoldDays: stats.avgHoldDays
      }
    }

    // Cache the results
    const cacheKey = computeHash(filteredTrades, settings as any)
    const serializedData = serializePerformanceData(performanceData)
    
    await prisma.perfSnapshot.create({
      data: {
        scope,
        hash: cacheKey,
        payload: serializedData
      }
    })

    // Clean up old cache entries (keep last 10 per scope)
    const oldSnapshots = await prisma.perfSnapshot.findMany({
      where: { scope },
      orderBy: { createdAt: 'desc' },
      skip: 10
    })

    if (oldSnapshots.length > 0) {
      await prisma.perfSnapshot.deleteMany({
        where: {
          id: { in: oldSnapshots.map(s => s.id) }
        }
      })
    }

    return NextResponse.json({
      success: true,
      cached: false,
      scope,
      data: performanceData
    })

  } catch (error) {
    console.error('Error fetching performance data:', error)
    return NextResponse.json({
      error: 'Failed to fetch performance data'
    }, { status: 500 })
  }
}

// Invalidate cache endpoint
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope')

    if (scope) {
      // Delete specific scope
      await prisma.perfSnapshot.deleteMany({
        where: { scope }
      })
    } else {
      // Delete all cache
      await prisma.perfSnapshot.deleteMany({})
    }

    return NextResponse.json({
      success: true,
      message: scope ? `Cache cleared for scope: ${scope}` : 'All cache cleared'
    })

  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json({
      error: 'Failed to clear cache'
    }, { status: 500 })
  }
}