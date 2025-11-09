import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Play, 
  TrendingUp,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  // Check subscription for dashboard access
  if (session?.user) {
    const { hasActiveSubscription } = await import('@/lib/access')
    const hasSubscription = await hasActiveSubscription(session.user.id)
    
    if (!hasSubscription) {
      redirect('/subscribe?required=true')
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6">
              <span className="text-white">Welcome to</span>
              <span className="text-yellow-400 ml-4">STEWART & CO</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Premium cryptocurrency research and analysis platform
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link href="/research" className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Research</h3>
            <p className="text-sm text-slate-600">Market analysis & insights</p>
          </Link>

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
            <h3 className="font-semibold text-slate-900 mb-2">Portfolio</h3>
            <p className="text-sm text-slate-600">Portfolio positions</p>
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
          <div className="flex gap-4 justify-center">
            <Button asChild className="bg-yellow-500 hover:bg-yellow-600">
              <Link href="/learning">
                Go to Learning Hub
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/community">
                Join Community
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
