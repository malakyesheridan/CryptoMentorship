import { getContent } from '@/lib/content'
import { formatContentDate } from '@/lib/content'
import { getSession } from '@/lib/auth-server'
import { canViewContent } from '@/lib/content'
import Link from 'next/link'
import { TrendingUp, Lock, Eye, Target, Calendar, ArrowRight, BarChart3, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import AdminSignalUploadWrapper from '@/components/AdminSignalUploadWrapper'
import { PortfolioContent } from '@/components/signals/PortfolioContent'
import { getOpenPositions, getClosedTrades } from '@/lib/portfolio/metrics'

export const dynamic = 'force-dynamic'

async function getPortfolioMetrics() {
  try {
    const { getPortfolioMetrics } = await import('@/lib/portfolio/metrics')
    return await getPortfolioMetrics('ALL')
  } catch (error) {
    console.error('Error fetching portfolio metrics:', error)
    return null
  }
}

async function getPerformanceData() {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth-server')
    const { prisma } = await import('@/lib/prisma')
    const { 
      buildEquityCurve, 
      calculatePerformanceStats, 
      calculateMonthlyReturns,
      filterTradesByScope
    } = await import('@/lib/perf')

    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return null
    }

    const settings = await prisma.portfolioSetting.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!settings) {
      return null
    }

    const allTrades = await prisma.signalTrade.findMany({
      orderBy: { entryTime: 'asc' }
    })

    const filteredTrades = filterTradesByScope(allTrades as any, 'ALL')

    const equitySeries = buildEquityCurve(filteredTrades, settings as any)
    const stats = calculatePerformanceStats(filteredTrades, equitySeries, settings.baseCapitalUsd)
    const monthlyReturns = calculateMonthlyReturns(equitySeries)

    // Convert Decimal objects to numbers for client components
    const { toNum } = await import('@/lib/num/dec')
    
    // Helper function to safely convert Decimal to number
    const toNumber = (val: any): number => {
      if (typeof val === 'number') return val
      if (val && typeof val === 'object' && 'toNumber' in val) return (val as any).toNumber()
      if (val && typeof val === 'object' && 'toSignificantDigits' in val) return toNum(val)
      return Number(val) || 0
    }
    
    const performanceData = {
      stats: {
        totalTrades: stats.totalTrades,
        avgHoldDays: stats.avgHoldDays,
        totalReturn: toNumber(stats.totalReturn),
        maxDrawdown: toNumber(stats.maxDrawdown),
        winRate: toNumber(stats.winRate),
        profitFactor: toNumber(stats.profitFactor),
        avgRMultiple: toNumber(stats.avgRMultiple),
        expectancy: toNumber(stats.expectancy),
        sharpeRatio: stats.sharpeRatio ? toNumber(stats.sharpeRatio) : undefined,
        calmarRatio: stats.calmarRatio ? toNumber(stats.calmarRatio) : undefined,
      },
      equitySeries: equitySeries.map(point => ({
        date: point.date,
        equity: toNumber(point.equity),
        drawdown: toNumber(point.drawdown),
      })),
      drawdownSeries: equitySeries.map(point => ({
        date: point.date,
        equity: toNumber(point.equity),
        drawdown: toNumber(point.drawdown),
      })),
      monthlyReturns: monthlyReturns.map(mr => ({
        year: mr.year,
        month: mr.month,
        return: toNumber(mr.return),
      }))
    }

    return {
      success: true,
      data: performanceData
    }
  } catch (error) {
    console.error('Error fetching performance data:', error)
    return null
  }
}

export default async function PortfolioPage() {
  try {
    const signalsResult = await getContent({ kind: 'signal' })
    const signals = Array.isArray(signalsResult) ? signalsResult : signalsResult.data
    const session = await getSession()
    const userRole = session?.user?.role || 'guest'
    const userTier = (session?.user as any)?.membershipTier || null
    
    // Fetch all portfolio data in parallel
    const [metrics, openPositions, closedTrades, performanceData] = await Promise.all([
      getPortfolioMetrics(),
      getOpenPositions().catch(() => []),
      getClosedTrades(50).catch(() => []),
      getPerformanceData()
    ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6">
              <span className="text-yellow-400">Portfolio</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Long-term investment portfolio and holdings for members
            </p>
            {metrics ? (
              <div className="flex items-center justify-center gap-6 text-slate-400 flex-wrap">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">
                    {openPositions.length} Active Holdings
                  </span>
                </div>
                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  <span className="font-medium">{closedTrades.length} Investments</span>
                </div>
                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">Long-term Focus</span>
                </div>
                {metrics.totalReturn > 0 && (
                  <>
                    <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-lg font-bold">●</span>
                      <span className="font-medium">
                        {metrics.totalReturn >= 0 ? '+' : ''}{metrics.totalReturn.toFixed(1)}% All Time Return
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-6 text-slate-400">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Loading portfolio...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Admin Upload Section */}
        <AdminSignalUploadWrapper userRole={userRole} />

        {/* Unified Portfolio Content with Tabs */}
        <PortfolioContent
          metrics={metrics}
          openPositions={openPositions}
          closedTrades={closedTrades}
          performanceData={performanceData}
          signals={signals}
          userRole={userRole}
          userTier={userTier}
        />

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mt-12">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-white text-sm font-bold">!</span>
            </div>
            <div>
              <h4 className="font-semibold text-amber-800 mb-2 text-lg">Important Disclaimer</h4>
              <p className="text-amber-700">
                This is not financial advice. Past performance does not guarantee future results. 
                All investing involves risk. Please do your own research before making any investment decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  } catch (error) {
    console.error('Error fetching signals data:', error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Portfolio</h1>
          <p className="text-slate-600 mb-8">Unable to load portfolio at this time. Please try again later.</p>
        </div>
      </div>
    )
  }
}
