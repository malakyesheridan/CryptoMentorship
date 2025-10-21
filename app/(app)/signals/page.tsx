import { getContent } from '@/lib/content'
import { formatContentDate } from '@/lib/content'
import { getSession } from '@/lib/auth-server'
import { canViewContent } from '@/lib/content'
import Link from 'next/link'
import { TrendingUp, Lock, Eye, Target, Calendar, ArrowRight, BarChart3, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import AdminSignalUploadWrapper from '@/components/AdminSignalUploadWrapper'

export const dynamic = 'force-dynamic'

export default async function SignalsPage() {
  try {
    const signalsResult = await getContent({ kind: 'signal' })
    const signals = Array.isArray(signalsResult) ? signalsResult : signalsResult.data
    const session = await getSession()
    const userRole = session?.user?.role || 'guest'
    const userTier = (session?.user as any)?.membershipTier || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6">
              <span className="text-white">Trading</span>
              <span className="text-yellow-400 ml-4">Signals</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Model portfolio and position recommendations for members
            </p>
            <div className="flex items-center justify-center gap-6 text-slate-400">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">+24.5% YTD Return</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                <span className="font-medium">68% Win Rate</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">2.1 Profit Factor</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Admin Upload Section */}
        <AdminSignalUploadWrapper userRole={userRole} />

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-2 flex">
            <Link href="/signals">
              <Button variant="ghost" className="rounded-xl px-6 py-3 font-medium">
                Open Positions
              </Button>
            </Link>
            <Link href="/signals/closed">
              <Button variant="ghost" className="rounded-xl px-6 py-3 font-medium">
                Closed Trades
              </Button>
            </Link>
            <Link href="/signals/performance">
              <Button variant="ghost" className="rounded-xl px-6 py-3 font-medium">
                <BarChart3 className="h-4 w-4 mr-2" />
                Performance
              </Button>
            </Link>
          </div>
        </div>

        {/* Performance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Total Return</h3>
            <p className="text-2xl font-bold text-green-600 mb-1">+24.5%</p>
            <p className="text-sm text-slate-600">YTD</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 transition-colors">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Max Drawdown</h3>
            <p className="text-2xl font-bold text-red-600 mb-1">-8.2%</p>
            <p className="text-sm text-slate-600">Peak to trough</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Win Rate</h3>
            <p className="text-2xl font-bold text-blue-600 mb-1">68%</p>
            <p className="text-sm text-slate-600">Closed trades</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Profit Factor</h3>
            <p className="text-2xl font-bold text-purple-600 mb-1">2.1</p>
            <p className="text-sm text-slate-600">Gross profit / loss</p>
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
      
        {/* Signals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {signals.map((signal) => {
            const canView = canViewContent(userRole, userTier, (signal as any).minTier, signal.locked)
            
            return (
              <Link key={signal.id} href={`/content/${(signal as any).slug || signal.id}`}>
                <article className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 relative">
                  {/* Signal Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          </div>
                          <Badge className={`text-xs px-2 py-1 ${signal.locked ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                            {signal.locked ? 'Member' : 'Public'}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-yellow-600 transition-colors line-clamp-2">
                          {signal.title}
                        </h3>
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                          {signal.excerpt || 'No description available.'}
                        </p>
                      </div>
                    </div>

                    {/* Signal Metadata */}
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatContentDate(signal.publishedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Trading Signal</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 group-hover:text-yellow-500 transition-colors">
                        <span className="font-medium">View</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>

                  {/* Access Control Overlay */}
                  {!canView && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-600">Member Only</p>
                        <p className="text-xs text-slate-500">Upgrade to access</p>
                      </div>
                    </div>
                  )}

                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </article>
              </Link>
            )
          })}
        </div>

        {/* Preview Signal */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-yellow-100/30 mb-12">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                <Target className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="font-semibold text-xl text-slate-800">
                  Market Outlook
                </h3>
                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">PREVIEW</Badge>
              </div>
              <p className="text-slate-600 mb-2">
                Current market sentiment remains cautiously optimistic with institutional adoption continuing to drive long-term fundamentals.
              </p>
              <p className="text-sm text-slate-500">
                Full analysis and specific recommendations available to members.
              </p>
            </div>
          </div>
        </div>
        
        {signals.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Trading Signals Available</h3>
            <p className="text-slate-500">Check back soon for new trading recommendations.</p>
          </div>
        )}
      </div>
    </div>
  )
  } catch (error) {
    console.error('Error fetching signals data:', error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Trading Signals</h1>
          <p className="text-slate-600 mb-8">Unable to load trading signals at this time. Please try again later.</p>
        </div>
      </div>
    )
  }
}
