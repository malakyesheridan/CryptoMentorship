import { requireActiveSubscription } from '@/lib/access'
import TradingViewWrapper from '@/components/signals/TradingViewWrapper'

// Revalidate every 5 minutes - dashboard is mostly static
export const revalidate = 300

export default async function DashboardPage() {
  await requireActiveSubscription()

  return (
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
  )
}
