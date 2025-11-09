'use client'

import { useState, Suspense } from 'react'
import { PortfolioTabs } from './PortfolioTabs'
import { TradeTable } from './TradeTable'
import { PerformanceKPIs } from './PerformanceKPIs'
import { EquityChart } from './EquityChart'
import { DrawdownChart } from './DrawdownChart'
import { MonthlyHeatmap } from './MonthlyHeatmap'
import { RDistributionChart } from './RDistributionChart'
import { EnhancedPerformanceCharts } from './EnhancedPerformanceCharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { TrendingUp, BarChart3, Download, RefreshCw } from 'lucide-react'
import Link from 'next/link'

type TabType = 'open' | 'closed' | 'performance' | 'analytics'

interface PortfolioContentProps {
  // Data
  metrics: any
  openPositions: any[]
  closedTrades: any[]
  performanceData: any | null
  signals: any[]
  
  // User info
  userRole: string
  userTier: string | null
}

export function PortfolioContent({
  metrics,
  openPositions,
  closedTrades,
  performanceData,
  signals,
  userRole,
  userTier
}: PortfolioContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>('open')

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <PortfolioTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={{
          openTrades: openPositions.length,
          closedTrades: closedTrades.length
        }}
      />

      {/* Tab Content */}
      {activeTab === 'open' && (
        <div className="space-y-6">
          {openPositions.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Active Holdings</h2>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              <TradeTable
                trades={openPositions.map(pos => {
                  const entryPrice = typeof pos.entryPrice === 'object' && 'toNumber' in pos.entryPrice
                    ? pos.entryPrice.toNumber()
                    : Number(pos.entryPrice)
                  
                  return {
                    id: pos.id,
                    slug: pos.slug,
                    symbol: pos.symbol,
                    direction: pos.direction,
                    entryTime: pos.entryTime,
                    entryPrice,
                    stopLoss: pos.stopLoss ? (typeof pos.stopLoss === 'object' && 'toNumber' in pos.stopLoss ? pos.stopLoss.toNumber() : Number(pos.stopLoss)) : undefined,
                    takeProfit: pos.takeProfit ? (typeof pos.takeProfit === 'object' && 'toNumber' in pos.takeProfit ? pos.takeProfit.toNumber() : Number(pos.takeProfit)) : undefined,
                    status: 'open' as const,
                    tags: pos.tags || [],
                    conviction: pos.conviction || undefined,
                    riskPct: pos.riskPct ? (typeof pos.riskPct === 'object' && 'toNumber' in pos.riskPct ? pos.riskPct.toNumber() : Number(pos.riskPct)) : undefined
                  }
                })}
                title="Active Positions"
                showFilters={true}
              />
            </>
          ) : (
            <EmptyState
              icon={<TrendingUp />}
              title="No Active Holdings"
              description="You currently have no active holdings. Check back for new portfolio recommendations."
            />
          )}
        </div>
      )}

      {activeTab === 'closed' && (
        <div className="space-y-6">
          {closedTrades.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Realized Investments</h2>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              <TradeTable
                trades={closedTrades.map(trade => ({
                  id: trade.id,
                  slug: trade.slug,
                  symbol: trade.symbol,
                  direction: trade.direction,
                  entryTime: trade.entryTime,
                  entryPrice: typeof trade.entryPrice === 'object' && 'toNumber' in trade.entryPrice
                    ? trade.entryPrice.toNumber()
                    : Number(trade.entryPrice),
                  exitTime: trade.exitTime,
                  exitPrice: trade.exitPrice ? (typeof trade.exitPrice === 'object' && 'toNumber' in trade.exitPrice
                    ? trade.exitPrice.toNumber()
                    : Number(trade.exitPrice)) : undefined,
                  stopLoss: trade.stopLoss ? (typeof trade.stopLoss === 'object' && 'toNumber' in trade.stopLoss
                    ? trade.stopLoss.toNumber()
                    : Number(trade.stopLoss)) : undefined,
                  takeProfit: trade.takeProfit ? (typeof trade.takeProfit === 'object' && 'toNumber' in trade.takeProfit
                    ? trade.takeProfit.toNumber()
                    : Number(trade.takeProfit)) : undefined,
                  status: 'closed' as const,
                  rMultiple: trade.rMultiple || undefined,
                  pnl: trade.pnl || undefined,
                  tags: trade.tags || [],
                  conviction: trade.conviction || undefined,
                  riskPct: trade.riskPct || undefined
                }))}
                title="Trade History"
                showFilters={true}
              />
            </>
          ) : (
            <EmptyState
              icon={<TrendingUp />}
              title="No Closed Trades"
              description="No closed trades available yet."
            />
          )}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {performanceData?.data ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Performance Metrics</h2>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <PerformanceKPIs
                stats={{
                  totalReturn: performanceData.data.stats.totalReturn * 100,
                  maxDrawdown: performanceData.data.stats.maxDrawdown * 100,
                  winRate: performanceData.data.stats.winRate * 100,
                  profitFactor: performanceData.data.stats.profitFactor,
                  avgRMultiple: performanceData.data.stats.avgRMultiple,
                  expectancy: performanceData.data.stats.expectancy,
                  totalTrades: performanceData.data.stats.totalTrades,
                  avgHoldDays: performanceData.data.stats.avgHoldDays,
                  sharpeRatio: performanceData.data.stats.sharpeRatio,
                  calmarRatio: performanceData.data.stats.calmarRatio
                }}
                timeRange="All Time"
              />

              <EnhancedPerformanceCharts
                data={{
                  stats: performanceData.data.stats,
                  equitySeries: performanceData.data.equitySeries,
                  drawdownSeries: performanceData.data.drawdownSeries,
                  monthlyReturns: performanceData.data.monthlyReturns,
                  tradeStats: {
                    totalTrades: performanceData.data.stats.totalTrades,
                    closedTrades: closedTrades.length,
                    openTrades: openPositions.length,
                    avgHoldDays: performanceData.data.stats.avgHoldDays
                  }
                }}
                scope="ALL"
              />
            </>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Performance Data Unavailable</h3>
              <p className="text-slate-600 mb-4">
                Unable to load performance data. Please try again later.
              </p>
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Portfolio Analytics</h2>
          <p className="text-slate-600">
            Comprehensive analytics and insights coming soon.
          </p>
          {/* Analytics content will be added in Phase 5 */}
        </div>
      )}

      {/* Signals Grid (visible on open tab if no positions) */}
      {activeTab === 'open' && openPositions.length === 0 && signals.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 mb-2">Portfolio Recommendations</CardTitle>
            <CardDescription>
              Explore available portfolio signals and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {signals.slice(0, 6).map((signal) => (
                <Link key={signal.id} href={`/content/${(signal as any).slug || signal.id}`}>
                  <Card className="hover:shadow-xl transition-all duration-300 h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        {signal.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {signal.excerpt || 'No description available.'}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

