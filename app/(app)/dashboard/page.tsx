import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Play, 
  Award,
  TrendingUp,
  BarChart3,
  Activity,
  ArrowRight,
  Sparkles,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { DashboardStats } from '@/components/learning/DashboardStats'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getSaved } from '@/lib/me'

// Import the same functions from learning page
async function getUserEnrollments(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      track: {
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          coverUrl: true,
          minTier: true,
          publishedAt: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  })
  return enrollments
}

async function getUserProgress(userId: string) {
  const progress = await prisma.lessonProgress.findMany({
    where: { userId },
    include: {
      lesson: {
        select: {
          id: true,
          trackId: true,
          title: true,
          durationMin: true,
        },
      },
    },
    orderBy: { completedAt: 'desc' },
  })
  return progress
}

async function getUserCertificates(userId: string) {
  const certificates = await prisma.certificate.findMany({
    where: { userId },
    include: {
      track: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
    orderBy: { issuedAt: 'desc' },
  })
  return certificates
}

async function getLearningActivity(userId: string, days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const activity = await prisma.lessonProgress.findMany({
    where: {
      userId,
      completedAt: { gte: startDate }
    },
    select: {
      completedAt: true
    },
    orderBy: { completedAt: 'asc' }
  })

  const activityByDate = activity.reduce((acc, item) => {
    if (item.completedAt) {
      const date = item.completedAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return Object.entries(activityByDate).map(([date, count]) => ({
    date,
    count
  }))
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  // Get learning data if user is logged in
  let learningData = null
  if (session?.user) {
    try {
      const [enrollments, progress, certificates, learningActivity, bookmarks] = await Promise.all([
        getUserEnrollments(session.user.id),
        getUserProgress(session.user.id),
        getUserCertificates(session.user.id),
        getLearningActivity(session.user.id),
        getSaved(6), // Get 6 recent bookmarks
      ])
      
      learningData = {
        totalEnrollments: enrollments.length,
        completedTracks: enrollments.filter(e => e.progressPct === 100).length,
        totalLessonsCompleted: progress.length,
        totalCertificates: certificates.length,
        learningActivity,
        bookmarks
      }
    } catch (error) {
      console.error('Error fetching learning data:', error)
      // Continue with null learningData to prevent page crash
      learningData = null
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

          <Link href="/macro" className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-200 transition-colors">
              <Play className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Crypto Compass</h3>
            <p className="text-sm text-slate-600">Weekly market overview</p>
          </Link>

          <Link href="/signals" className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Signals</h3>
            <p className="text-sm text-slate-600">Trading recommendations</p>
          </Link>

          <Link href="/resources" className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 transition-colors">
              <Award className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Resources</h3>
            <p className="text-sm text-slate-600">Tools & guides</p>
          </Link>
        </div>

        {/* Learning Section */}
        <div className="mb-12">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <BarChart3 className="h-6 w-6" />
                Learning Dashboard
              </CardTitle>
              <CardDescription className="text-blue-700">
                Track your progress and continue your learning journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              {learningData ? (
                <DashboardStats 
                  totalEnrollments={learningData.totalEnrollments}
                  completedTracks={learningData.completedTracks}
                  totalLessonsCompleted={learningData.totalLessonsCompleted}
                  totalCertificates={learningData.totalCertificates}
                  learningActivity={learningData.learningActivity}
                  bookmarks={learningData.bookmarks}
                  showActivityChart={true}
                  showBookmarks={true}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/learn" className="group">
                    <Card className="group-hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-6 text-center">
                        <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                        <h3 className="font-semibold text-slate-900 mb-2">Learning Tracks</h3>
                        <p className="text-sm text-slate-600">Structured courses</p>
                      </CardContent>
                    </Card>
                  </Link>
                  
                  <Link href="/learning" className="group">
                    <Card className="group-hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-6 text-center">
                        <Activity className="h-8 w-8 text-green-600 mx-auto mb-3" />
                        <h3 className="font-semibold text-slate-900 mb-2">My Progress</h3>
                        <p className="text-sm text-slate-600">Track your learning</p>
                      </CardContent>
                    </Card>
                  </Link>
                  
                  <Link href="/me/saved" className="group">
                    <Card className="group-hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-6 text-center">
                        <Award className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                        <h3 className="font-semibold text-slate-900 mb-2">Saved Content</h3>
                        <p className="text-sm text-slate-600">Bookmarked items</p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Community Section */}
        <div className="mb-12">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Activity className="h-6 w-6" />
                Community
              </CardTitle>
              <CardDescription className="text-green-700">
                Connect with other members and stay updated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/community" className="group">
                  <Card className="group-hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <Activity className="h-8 w-8 text-green-600 mx-auto mb-3" />
                      <h3 className="font-semibold text-slate-900 mb-2">Community Chat</h3>
                      <p className="text-sm text-slate-600">Join the conversation</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link href="/events" className="group">
                  <Card className="group-hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                      <h3 className="font-semibold text-slate-900 mb-2">Events</h3>
                      <p className="text-sm text-slate-600">Upcoming sessions</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </CardContent>
          </Card>
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
              <Link href="/resources">
                View Resources
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
