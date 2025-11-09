import { Suspense } from 'react'
import { getSession } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import { TradeDetail } from '@/components/signals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { ViewTracker } from '@/components/ViewTracker'

interface SignalDetailPageProps {
  params: {
    slug: string
  }
}

async function getSignalBySlug(slug: string) {
  // TODO: Implement actual data fetching from database
  // For now, return mock data based on slug
  const mockSignals = {
    'btc-long-2024-01': {
      id: '1',
      slug: 'btc-long-2024-01',
      symbol: 'BTC',
      direction: 'long' as const,
      thesis: `# Bitcoin Long Position Analysis

## Market Context
Bitcoin has shown strong institutional adoption with multiple spot ETF approvals driving significant capital inflows. The technical analysis suggests a breakout from a long-term consolidation pattern.

## Technical Analysis
- **Entry Level**: $45,000 (key resistance turned support)
- **Stop Loss**: $42,000 (below major support zone)
- **Take Profit**: $50,000 (next major resistance level)
- **Risk/Reward**: 1:1.67

## Fundamental Catalysts
1. **Institutional Adoption**: Continued growth in corporate treasury allocations
2. **Regulatory Clarity**: Clearer regulatory framework supporting institutional participation
3. **Supply Dynamics**: Reduced selling pressure from miners post-halving
4. **Macro Environment**: Potential Fed pivot supporting risk assets

## Risk Factors
- High correlation with traditional risk assets
- Regulatory uncertainty in some jurisdictions
- Market volatility during major news events

## Position Sizing
- **Risk Percentage**: 2.5% of portfolio
- **Conviction Level**: 4/5 stars
- **Expected Hold Time**: 2-4 weeks

*This analysis is for educational purposes only and not financial advice.*`,
      tags: ['Bitcoin', 'Long-term', 'Institutional'],
      entryTime: new Date('2024-01-15T10:00:00'),
      entryPrice: 45000,
      stopLoss: 42000,
      takeProfit: 50000,
      conviction: 4,
      riskPct: 2.5,
      status: 'closed' as const,
      exitTime: new Date('2024-01-25T14:30:00'),
      exitPrice: 48000,
      notes: 'Position closed early due to profit-taking at resistance level. Strong performance with 1.0R multiple achieved.',
      rMultiple: 1.0,
      pnl: 3000,
      createdAt: new Date('2024-01-15T09:00:00'),
      updatedAt: new Date('2024-01-25T14:30:00')
    },
    'eth-short-2024-02': {
      id: '2',
      slug: 'eth-short-2024-02',
      symbol: 'ETH',
      direction: 'short' as const,
      thesis: `# Ethereum Short Position Analysis

## Market Context
Ethereum showing signs of weakness after failed breakout attempt. Technical indicators suggest potential downside continuation.

## Technical Analysis
- **Entry Level**: $3,200 (failed breakout level)
- **Stop Loss**: $3,400 (above recent high)
- **Take Profit**: $2,800 (support level)
- **Risk/Reward**: 1:2

## Fundamental Concerns
1. **Network Congestion**: High gas fees limiting adoption
2. **Competition**: Layer 2 solutions gaining traction
3. **Regulatory Pressure**: Potential SEC classification concerns
4. **Technical Debt**: Scaling challenges remain unresolved

## Risk Factors
- Strong developer ecosystem
- Institutional staking growth
- Potential protocol upgrades

## Position Sizing
- **Risk Percentage**: 1.5% of portfolio
- **Conviction Level**: 3/5 stars
- **Expected Hold Time**: 1-2 weeks

*This analysis is for educational purposes only and not financial advice.*`,
      tags: ['Ethereum', 'Short-term', 'Technical'],
      entryTime: new Date('2024-02-01T09:30:00'),
      entryPrice: 3200,
      stopLoss: 3400,
      takeProfit: 2800,
      conviction: 3,
      riskPct: 1.5,
      status: 'closed' as const,
      exitTime: new Date('2024-02-10T11:15:00'),
      exitPrice: 3100,
      notes: 'Position closed at partial profit. Market showed more resilience than expected.',
      rMultiple: 0.5,
      pnl: 1000,
      createdAt: new Date('2024-02-01T09:00:00'),
      updatedAt: new Date('2024-02-10T11:15:00')
    }
  }

  return mockSignals[slug as keyof typeof mockSignals] || null
}

export default async function SignalDetailPage({ params }: SignalDetailPageProps) {
  const session = await getSession()
  
  if (!session?.user) {
    redirect('/login')
  }

  const signal = await getSignalBySlug(params.slug)

  if (!signal) {
    notFound()
  }

  return (
    <div className="container-main section-padding">
      <ViewTracker entityType="signal" entityId={signal.id} disabled={!session?.user?.id} />
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/portfolio">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portfolio
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="heading-two-tone text-4xl sm:text-5xl">
              <span>{signal.symbol}</span> <span className="gold">{signal.direction.toUpperCase()}</span>
            </h1>
            <p className="text-slate-600 mt-2">
              Signal Analysis & Performance
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <div>
            <h4 className="font-semibold text-amber-800 mb-1">Important Disclaimer</h4>
            <p className="text-sm text-amber-700">
              This is not financial advice. Past performance does not guarantee future results. 
              All investing involves risk. Please do your own research before making any investment decisions.
            </p>
          </div>
        </div>
      </div>

      {/* Trade Detail */}
      <Suspense fallback={<div className="text-center py-8">Loading trade details...</div>}>
        <TradeDetail 
          trade={signal}
          onBack={() => {
            // TODO: Implement navigation
            console.log('Navigate back')
          }}
        />
      </Suspense>

      {/* Related Signals */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Related Portfolio Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/portfolio/sol-long-2024-03" className="block">
              <div className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-sm font-bold">SOL</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">SOL Long</h4>
                    <p className="text-sm text-slate-600">March 2024</p>
                  </div>
                </div>
              </div>
            </Link>
            
            <Link href="/portfolio/avax-short-2024-04" className="block">
              <div className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 text-sm font-bold">AVAX</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">AVAX Short</h4>
                    <p className="text-sm text-slate-600">April 2024</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
