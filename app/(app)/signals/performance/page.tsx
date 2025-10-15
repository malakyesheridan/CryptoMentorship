import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { PerformanceKPIs } from '@/components/signals/PerformanceKPIs'
import { EquityChart } from '@/components/signals/EquityChart'
import { DrawdownChart } from '@/components/signals/DrawdownChart'
import { MonthlyHeatmap } from '@/components/signals/MonthlyHeatmap'
import { RDistributionChart } from '@/components/signals/RDistributionChart'
import { TradeTable } from '@/components/signals/TradeTable'
import { EnhancedPerformanceCharts } from '@/components/signals/EnhancedPerformanceCharts'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/Callout'
import Link from 'next/link'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3,
  Info,
  Download
} from 'lucide-react'

async function getPerformanceData(scope: string = 'ALL') {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/signals/performance?scope=${scope}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch performance data')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching performance data:', error)
    return null
  }
}

async function getTrades(scope: string = 'ALL'): Promise<any[]> {
  try {
    // TODO: Implement actual trade fetching
    return []
  } catch (error) {
    console.error('Error fetching trades:', error)
    return []
  }
}

export default async function PerformancePage({
  searchParams
}: {
  searchParams: { scope?: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  const scope = searchParams.scope || 'ALL'
  const performanceData = await getPerformanceData(scope)
  const trades = await getTrades(scope)

  if (!performanceData?.success) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Performance Data Unavailable</h1>
            <p className="text-slate-600">
              Unable to load performance data. Please try again later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { data } = performanceData

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Signals Performance</h1>
              <p className="text-slate-600 mt-2">
                Track the performance of our trading signals and model portfolio
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm font-medium text-slate-700">Time Range:</span>
            <div className="flex items-center gap-1">
              {['ALL', 'YTD', '1Y', '90D'].map((timeRange) => (
                <Button
                  key={timeRange}
                  variant={scope === timeRange ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  asChild
                >
                  <a href={`/signals/performance?scope=${timeRange}`}>
                    {timeRange}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <Callout type="warning" className="mb-8">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Not Financial Advice</h4>
              <p className="text-yellow-700 text-sm mt-1">
                Past performance does not guarantee future results. This data is for educational purposes only 
                and should not be considered as financial advice. Always do your own research and consider 
                your risk tolerance before making investment decisions.
              </p>
            </div>
          </div>
        </Callout>

        {/* Enhanced Charts Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Enhanced Performance Visualization</h2>
          <Suspense fallback={<div className="text-center py-8">Loading enhanced charts...</div>}>
            <EnhancedPerformanceCharts 
              data={data} 
              scope={scope}
              onRefresh={() => window.location.reload()}
            />
          </Suspense>
        </div>

        {/* Performance KPIs */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Key Performance Indicators</h2>
          <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-4 gap-6">Loading KPIs...</div>}>
            <PerformanceKPIs stats={data.stats} timeRange={scope} />
          </Suspense>
        </div>

        {/* Original Charts Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Detailed Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Equity Curve */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-slate-900">Equity Curve</h3>
              </div>
              <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading chart...</div>}>
                <EquityChart equityPoints={data.equitySeries} baseCapital={data.stats.initialCapital || 10000} />
              </Suspense>
            </div>

            {/* Drawdown Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-slate-900">Drawdown</h3>
              </div>
              <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading chart...</div>}>
                <DrawdownChart equityPoints={data.drawdownSeries} />
              </Suspense>
            </div>

            {/* Monthly Returns Heatmap */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">Monthly Returns</h3>
              </div>
              <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading heatmap...</div>}>
                <MonthlyHeatmap monthlyReturns={data.monthlyReturns} />
              </Suspense>
            </div>

            {/* R-Multiple Distribution */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-slate-900">R-Multiple Distribution</h3>
              </div>
              <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading chart...</div>}>
                <RDistributionChart rMultiples={data.rMultiples} />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-lg font-semibold text-slate-900">
              <Info className="h-5 w-5 text-slate-600" />
              Methodology & Assumptions
            </summary>
            <div className="mt-4 text-sm text-slate-600 space-y-3">
              <div>
                <h4 className="font-medium text-slate-800">Position Sizing Model:</h4>
                <p>Risk-based position sizing using the specified risk percentage. Position size = (risk% × equity) ÷ |entry price - stop loss|. If no stop loss is provided, falls back to 1% of equity per trade.</p>
              </div>
              <div>
                <h4 className="font-medium text-slate-800">Fees & Slippage:</h4>
                <p>Applied at entry and exit: {data.stats.feesBps || 10} basis points for fees, {data.stats.slippageBps || 5} basis points for slippage.</p>
              </div>
              <div>
                <h4 className="font-medium text-slate-800">R-Multiple Calculation:</h4>
                <p>For long trades: R = (exit price - entry price) ÷ (entry price - stop loss). For short trades: R = (entry price - exit price) ÷ (stop loss - entry price).</p>
              </div>
              <div>
                <h4 className="font-medium text-slate-800">Performance Metrics:</h4>
                <p>Total return calculated from equity curve. Max drawdown is the largest peak-to-trough decline. Win rate is percentage of profitable trades. Profit factor is gross profit ÷ gross loss.</p>
              </div>
            </div>
          </details>
        </div>

        {/* Trade Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Open Positions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Open Positions</h3>
            <Suspense fallback={<div className="text-center py-4">Loading open positions...</div>}>
              <TradeTable 
                trades={trades.filter(t => t.status === 'OPEN')}
                title=""
                showFilters={false}
                compact={true}
              />
            </Suspense>
          </div>

          {/* Recent Closed Trades */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Closed Trades</h3>
            <Suspense fallback={<div className="text-center py-4">Loading closed trades...</div>}>
              <TradeTable 
                trades={trades.filter(t => t.status === 'CLOSED').slice(0, 10)}
                title=""
                showFilters={false}
                compact={true}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}