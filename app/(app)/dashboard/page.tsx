import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Play, 
  TrendingUp,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { SubscriptionGuard } from '@/components/SubscriptionGuard'

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
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link href="/crypto-compass" className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-200 transition-colors">
              <Play className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Crypto Compass</h3>
            <p className="text-sm text-slate-600">Weekly market overview</p>
          </Link>

          <Link href="/portfolio" className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">My Portfolio</h3>
            <p className="text-sm text-slate-600">View Daily Updates to Coen&apos;s Portfolio</p>
          </Link>

          <Link href="/learning" className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Learning Hub</h3>
            <p className="text-sm text-slate-600">Courses & resources</p>
          </Link>
        </div>

        {/* Welcome Message */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Welcome to your Dashboard!
          </h2>
          <p className="text-slate-600 mb-6">
            You&apos;re successfully logged in. Choose from the options above to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-yellow-500 hover:bg-yellow-600 w-full sm:w-auto min-h-[44px]">
              <Link href="/learning">
                Go to Learning Hub
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto min-h-[44px]">
              <Link href="/community">
                Join Community
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
    </SubscriptionGuard>
  )
}
