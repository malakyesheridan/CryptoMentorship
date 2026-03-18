import { Suspense } from 'react'
import { requireActiveSubscription } from '@/lib/access'
import { TradeTable } from '@/components/signals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingDown, Download, Filter } from 'lucide-react'

async function getClosedTrades() {
  try {
    const { prisma } = await import('@/lib/prisma')
    const { Decimal } = await import('@/lib/num')

    const closedTrades = await prisma.signalTrade.findMany({
      where: { status: 'closed' },
      orderBy: { exitTime: 'desc' }
    })

    return closedTrades.map(trade => {
      const entryPrice = new Decimal(trade.entryPrice.toString())
      const exitPrice = trade.exitPrice ? new Decimal(trade.exitPrice.toString()) : null
      const stopLoss = trade.stopLoss ? new Decimal(trade.stopLoss.toString()) : null
      
      // Calculate P&L
      let pnl = 0
      let rMultiple: number | null = null
      
      if (exitPrice && trade.exitTime) {
        if (trade.direction === 'long') {
          pnl = exitPrice.sub(entryPrice).toNumber()
        } else {
          pnl = entryPrice.sub(exitPrice).toNumber()
        }
        
        // Calculate R-multiple if stop loss exists
        if (stopLoss) {
          const risk = trade.direction === 'long'
            ? entryPrice.sub(stopLoss)
            : stopLoss.sub(entryPrice)
          
          if (!risk.isZero()) {
            rMultiple = pnl / risk.toNumber()
          }
        }
      }
      
      return {
        id: trade.id,
        slug: trade.slug,
        symbol: trade.symbol,
        direction: trade.direction as 'long' | 'short',
        entryTime: trade.entryTime,
        entryPrice: entryPrice.toNumber(),
        stopLoss: stopLoss?.toNumber(),
        takeProfit: trade.takeProfit ? new Decimal(trade.takeProfit.toString()).toNumber() : undefined,
        status: 'closed' as const,
        exitTime: trade.exitTime || undefined,
        exitPrice: exitPrice?.toNumber(),
        rMultiple,
        pnl,
        tags: trade.tags ? JSON.parse(trade.tags) : [],
        conviction: trade.conviction || undefined,
        riskPct: trade.riskPct ? new Decimal(trade.riskPct.toString()).toNumber() : undefined
      }
    })
  } catch (error) {
    console.error('Error fetching closed trades:', error)
    return []
  }
}

// Old mock data structure removed - real data fetching implemented above

export default async function ClosedTradesPage() {
  await requireActiveSubscription()

  const closedTrades = await getClosedTrades()

  // Calculate summary statistics
  const totalTrades = closedTrades.length
  const winningTrades = closedTrades.filter(trade => trade.rMultiple !== null && trade.rMultiple > 0).length
  const losingTrades = closedTrades.filter(trade => trade.rMultiple !== null && trade.rMultiple < 0).length
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0
  const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  const avgRMultiple = totalTrades > 0 ? 
    closedTrades.reduce((sum, trade) => sum + (trade.rMultiple || 0), 0) / totalTrades : 0

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6">
              <span className="text-white">Closed</span>
              <span className="text-yellow-400 ml-4">Trades</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Historical performance of completed portfolio positions
            </p>
            <div className="flex items-center justify-center gap-6 text-slate-400">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                <span className="font-medium">{totalTrades} Total Trades</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-lg font-bold">✓</span>
                <span className="font-medium">{winRate}% Win Rate</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-lg font-bold">R</span>
                <span className="font-medium">{avgRMultiple.toFixed(2)} Avg R-Multiple</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-[var(--bg-panel)] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-[#1a1815] rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-[#2a2520] transition-colors">
              <TrendingDown className="h-6 w-6 text-[var(--text-strong)]" />
            </div>
            <h3 className="font-semibold text-[var(--text-strong)] mb-2">Total Trades</h3>
            <p className="text-2xl font-bold text-[var(--text-strong)] mb-1">{totalTrades}</p>
            <p className="text-sm text-[var(--text-strong)]">Completed</p>
          </div>

          <div className="bg-[var(--bg-panel)] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-[#1a2e1a] rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-[#1a2e1a] transition-colors">
              <span className="text-[#4a7c3f] text-lg font-bold">✓</span>
            </div>
            <h3 className="font-semibold text-[var(--text-strong)] mb-2">Win Rate</h3>
            <p className="text-2xl font-bold text-[#4a7c3f] mb-1">{winRate}%</p>
            <p className="text-sm text-[var(--text-strong)]">{winningTrades} wins</p>
          </div>

          <div className="bg-[var(--bg-panel)] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-[#1a1e2e] rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-[#1a1e2e] transition-colors">
              <span className="text-blue-400 text-lg font-bold">R</span>
            </div>
            <h3 className="font-semibold text-[var(--text-strong)] mb-2">Avg R-Multiple</h3>
            <p className="text-2xl font-bold text-blue-400 mb-1">{avgRMultiple.toFixed(2)}</p>
            <p className="text-sm text-[var(--text-strong)]">Risk-adjusted</p>
          </div>

          <div className="bg-[var(--bg-panel)] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-[#1a1e2e] rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-[#1a1e2e] transition-colors">
              <span className="text-purple-400 text-lg font-bold">$</span>
            </div>
            <h3 className="font-semibold text-[var(--text-strong)] mb-2">Total P&L</h3>
            <p className={`text-2xl font-bold mb-1 ${totalPnL >= 0 ? 'text-[#4a7c3f]' : 'text-[#c03030]'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}
            </p>
            <p className="text-sm text-[var(--text-strong)]">Realized</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-[#2a2418] border border-[var(--border-subtle)] rounded-2xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-white text-sm font-bold">!</span>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--text-strong)] mb-2 text-lg">Important Disclaimer</h4>
              <p className="text-[var(--text-muted)]">
                This is not financial advice. Past performance does not guarantee future results.
                All investing involves risk. Please do your own research before making any investment decisions.
              </p>
            </div>
          </div>
        </div>

      {/* Trades Table */}
      <Suspense fallback={<div className="text-center py-8">Loading closed trades...</div>}>
        <TradeTable 
          trades={closedTrades.map(trade => ({
            ...trade,
            rMultiple: trade.rMultiple ?? undefined,
            exitTime: trade.exitTime ?? undefined
          }))}
          title="All Closed Trades"
          showFilters={true}
        />
      </Suspense>

        {/* Performance Analysis */}
        <div className="bg-[var(--bg-panel)] rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="h-6 w-6 text-[var(--text-strong)]" />
            <h3 className="text-xl font-semibold text-[var(--text-strong)]">Performance Analysis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-[var(--text-strong)] mb-4">Trade Distribution</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Winning Trades:</span>
                  <span className="font-medium text-[#4a7c3f]">{winningTrades} ({winRate}%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Losing Trades:</span>
                  <span className="font-medium text-[#c03030]">{losingTrades} ({100 - winRate}%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Break-even Trades:</span>
                  <span className="font-medium text-[var(--text-muted)]">
                    {totalTrades - winningTrades - losingTrades} (0%)
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--text-strong)] mb-4">Risk Metrics</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Average R-Multiple:</span>
                  <span className="font-medium">{avgRMultiple.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Best Trade:</span>
                  <span className="font-medium text-[#4a7c3f]">
                    {Math.max(...closedTrades.map(t => t.rMultiple || 0)).toFixed(2)}R
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Worst Trade:</span>
                  <span className="font-medium text-[#c03030]">
                    {Math.min(...closedTrades.map(t => t.rMultiple || 0)).toFixed(2)}R
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
