import { requireActiveSubscription } from '@/lib/access'
import DailySignalManager from '@/components/signals/DailySignalManager'
import { PortfolioWizard } from '@/components/portfolio/PortfolioWizard'
import { RiskOnboardingGate } from '@/components/risk-onboarding/RiskOnboardingGate'
import { unstable_cache } from 'next/cache'

// Revalidate every 5 minutes (300 seconds) - portfolio data is historical, not real-time
export const revalidate = 300

// Cache performance data for 5 minutes
const getCachedPerformanceData = unstable_cache(
  async () => {
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

      // Limit to last 2 years OR 10,000 trades max (whichever is more restrictive)
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
      
      const allTrades = await prisma.signalTrade.findMany({
        where: {
          entryTime: { gte: twoYearsAgo }
        },
        orderBy: { entryTime: 'asc' },
        take: 10000 // Safety limit
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
  },
  ['portfolio-performance'],
  { revalidate: 300 } // 5 minutes
)

async function getPerformanceData() {
  return getCachedPerformanceData()
}

export default async function PortfolioPage() {
  const user = await requireActiveSubscription()

  try {
    const userRole = user.role || 'guest'
    const userTier = (user as any)?.membershipTier || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <PortfolioWizard />
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6" data-tour="portfolio-hero">
              <span className="text-white">My </span>
              <span className="text-yellow-400">Portfolio</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-8 px-4">
              View Daily Updates to Coen&apos;s Portfolio
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <RiskOnboardingGate />
        {/* Daily Signal Manager (Upload + Display) */}
        <div className="mb-8" data-tour="portfolio-updates">
          <DailySignalManager userTier={userTier} userRole={userRole} />
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mt-12" data-tour="portfolio-disclaimer">
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
    console.error('Error fetching content data:', error)
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




