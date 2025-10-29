import { Suspense } from 'react'
import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { TradeTable } from '@/components/signals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingDown, Download, Filter } from 'lucide-react'

async function getClosedTrades() {
  // TODO: Implement actual data fetching from database
  // For now, return mock data
  return [
    {
      id: '1',
      slug: 'btc-long-2024-01',
      symbol: 'BTC',
      direction: 'long' as const,
      entryTime: new Date('2024-01-15'),
      entryPrice: 45000,
      stopLoss: 42000,
      takeProfit: 50000,
      status: 'closed' as const,
      exitTime: new Date('2024-01-25'),
      exitPrice: 48000,
      rMultiple: 1.0,
      pnl: 3000,
      tags: ['Bitcoin', 'Long-term'],
      conviction: 4,
      riskPct: 2.5
    },
    {
      id: '2',
      slug: 'eth-short-2024-02',
      symbol: 'ETH',
      direction: 'short' as const,
      entryTime: new Date('2024-02-01'),
      entryPrice: 3200,
      stopLoss: 3400,
      takeProfit: 2800,
      status: 'closed' as const,
      exitTime: new Date('2024-02-10'),
      exitPrice: 3100,
      rMultiple: 0.5,
      pnl: 1000,
      tags: ['Ethereum', 'Short-term'],
      conviction: 3,
      riskPct: 1.5
    },
    {
      id: '3',
      slug: 'sol-long-2024-03',
      symbol: 'SOL',
      direction: 'long' as const,
      entryTime: new Date('2024-03-05'),
      entryPrice: 120,
      stopLoss: 100,
      takeProfit: 150,
      status: 'closed' as const,
      exitTime: new Date('2024-03-20'),
      exitPrice: 140,
      rMultiple: 1.0,
      pnl: 2000,
      tags: ['Solana', 'DeFi'],
      conviction: 4,
      riskPct: 2.0
    },
    {
      id: '4',
      slug: 'avax-short-2024-04',
      symbol: 'AVAX',
      direction: 'short' as const,
      entryTime: new Date('2024-04-10'),
      entryPrice: 35,
      stopLoss: 38,
      takeProfit: 30,
      status: 'closed' as const,
      exitTime: new Date('2024-04-25'),
      exitPrice: 32,
      rMultiple: 1.0,
      pnl: 3000,
      tags: ['Avalanche', 'Layer 1'],
      conviction: 3,
      riskPct: 1.8
    },
    {
      id: '5',
      slug: 'matic-long-2024-05',
      symbol: 'MATIC',
      direction: 'long' as const,
      entryTime: new Date('2024-05-01'),
      entryPrice: 0.85,
      stopLoss: 0.75,
      takeProfit: 1.00,
      status: 'closed' as const,
      exitTime: new Date('2024-05-15'),
      exitPrice: 0.78,
      rMultiple: -0.7,
      pnl: -700,
      tags: ['Polygon', 'Scaling'],
      conviction: 2,
      riskPct: 1.0
    }
  ]
}

export default async function ClosedTradesPage() {
  const session = await getSession()
  
  if (!session?.user) {
    redirect('/login')
  }

  const closedTrades = await getClosedTrades()

  // Calculate summary statistics
  const totalTrades = closedTrades.length
  const winningTrades = closedTrades.filter(trade => trade.rMultiple > 0).length
  const losingTrades = closedTrades.filter(trade => trade.rMultiple < 0).length
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0
  const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  const avgRMultiple = totalTrades > 0 ? 
    closedTrades.reduce((sum, trade) => sum + (trade.rMultiple || 0), 0) / totalTrades : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
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
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-slate-200 transition-colors">
              <TrendingDown className="h-6 w-6 text-slate-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Total Trades</h3>
            <p className="text-2xl font-bold text-slate-900 mb-1">{totalTrades}</p>
            <p className="text-sm text-slate-600">Completed</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
              <span className="text-green-600 text-lg font-bold">✓</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Win Rate</h3>
            <p className="text-2xl font-bold text-green-600 mb-1">{winRate}%</p>
            <p className="text-sm text-slate-600">{winningTrades} wins</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
              <span className="text-blue-600 text-lg font-bold">R</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Avg R-Multiple</h3>
            <p className="text-2xl font-bold text-blue-600 mb-1">{avgRMultiple.toFixed(2)}</p>
            <p className="text-sm text-slate-600">Risk-adjusted</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
              <span className="text-purple-600 text-lg font-bold">$</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Total P&L</h3>
            <p className={`text-2xl font-bold mb-1 ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}
            </p>
            <p className="text-sm text-slate-600">Realized</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-white text-sm font-bold">!</span>
            </div>
            <div>
              <h4 className="font-semibold text-amber-800 mb-2 text-lg">Important Disclaimer</h4>
              <p className="text-amber-700">
                This is not financial advice. Past performance does not guarantee future results. 
                All trading involves risk. Please do your own research before making any investment decisions.
              </p>
            </div>
          </div>
        </div>

      {/* Trades Table */}
      <Suspense fallback={<div className="text-center py-8">Loading closed trades...</div>}>
        <TradeTable 
          trades={closedTrades}
          title="All Closed Trades"
          showFilters={true}
        />
      </Suspense>

        {/* Performance Analysis */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="h-6 w-6 text-slate-600" />
            <h3 className="text-xl font-semibold text-slate-900">Performance Analysis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Trade Distribution</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Winning Trades:</span>
                  <span className="font-medium text-green-600">{winningTrades} ({winRate}%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Losing Trades:</span>
                  <span className="font-medium text-red-600">{losingTrades} ({100 - winRate}%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Break-even Trades:</span>
                  <span className="font-medium text-slate-600">
                    {totalTrades - winningTrades - losingTrades} (0%)
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Risk Metrics</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Average R-Multiple:</span>
                  <span className="font-medium">{avgRMultiple.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Best Trade:</span>
                  <span className="font-medium text-green-600">
                    {Math.max(...closedTrades.map(t => t.rMultiple || 0)).toFixed(2)}R
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Worst Trade:</span>
                  <span className="font-medium text-red-600">
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
