import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { SubscriptionGuard } from '@/components/SubscriptionGuard'
import TradingViewWrapper from '@/components/signals/TradingViewWrapper'
import { PortfolioRoiPanel } from '@/components/roi-dashboard/PortfolioRoiPanel'

// Revalidate every 5 minutes - dashboard is mostly static
export const revalidate = 300

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  // Check subscription for dashboard access
  // ✅ OPTIMIZED: Admins bypass, others checked via client-side (non-blocking)
  // Subscription check moved to client-side to avoid blocking page load
  // The /api/me/subscription-status endpoint is cached and fast
  if (session?.user && session.user.role !== 'admin') {
    // For non-admins, we'll check subscription client-side
    // This allows the page to render immediately while check happens in background
  }
  return (
    <SubscriptionGuard userRole={session?.user?.role}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6">
              <span className="text-white">Welcome to</span>
              <span className="text-yellow-400 ml-2 sm:ml-4">STEWART & CO</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-8 px-4">
              Premium cryptocurrency research and analysis platform
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* ROI Dashboard */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">ROI Dashboard</h2>
            <p className="text-slate-600 mt-2">
              Snapshot of model performance, benchmarks, and allocation updates.
            </p>
          </div>
          <PortfolioRoiPanel />
        </div>

        {/* TradingView Chart */}
        <div className="mb-12">
          <TradingViewWrapper />
        </div>

        {/* Welcome Message */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Welcome to your Dashboard!
          </h2>
          <p className="text-slate-600 mb-6">
            You&apos;re successfully logged in. Choose from the options above to get started.
          </p>
        </div>
      </div>
    </div>
    </SubscriptionGuard>
  )
}
