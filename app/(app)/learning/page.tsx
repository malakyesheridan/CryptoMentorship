import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'
import {
  BookOpen,
  Clock,
  Play,
  CheckCircle,
  Award,
  TrendingUp,
  Calendar,
  Target,
  Trophy,
  Flame,
  ArrowRight,
  BarChart3,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { CourseCarousel } from '@/components/learning/CourseCarousel'
import { StreakWidget } from '@/components/learning/StreakWidget'
import { CourseSearch } from '@/components/learning/CourseSearch'
import { EnhancedStats } from '@/components/learning/EnhancedStats'
import { CourseRecommendations } from '@/components/learning/CourseRecommendations'
import { ProgressTimeline } from '@/components/learning/ProgressTimeline'
import { SmartNotifications } from '@/components/learning/SmartNotifications'
import { LearningAnalytics } from '@/components/learning/LearningAnalytics'
import { RealTimeProgress } from '@/components/learning/RealTimeProgress'

export const dynamic = 'force-dynamic'

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
          sections: {
            include: {
              lessons: {
                where: { publishedAt: { not: null } },
                select: { id: true, durationMin: true },
              },
            },
          },
          lessons: {
            where: { publishedAt: { not: null } },
            select: { id: true, durationMin: true },
          },
        },
      },
    },
    orderBy: [
      { progressPct: 'desc' }, // In-progress first
      { startedAt: 'desc' }   // Then by most recent
    ],
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

  // Group by date and count lessons per day
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

// Helper function to transform enrollment data for CourseCarousel
function transformEnrollmentsForCarousel(enrollments: any[]) {
  return enrollments.map(enrollment => {
    const totalLessons = enrollment.track.lessons.length
    const completedLessons = Math.round((enrollment.progressPct / 100) * totalLessons)
    
    return {
      id: enrollment.track.id,
      slug: enrollment.track.slug,
      title: enrollment.track.title,
      summary: enrollment.track.summary,
      coverUrl: enrollment.track.coverUrl,
      progressPct: enrollment.progressPct,
      startedAt: enrollment.startedAt,
      completedAt: enrollment.completedAt,
      totalLessons,
      completedLessons
    }
  })
}

// Function to get all available courses for search
async function getAllCourses(userId: string) {
  const [tracks, enrollments] = await Promise.all([
    prisma.track.findMany({
      where: {
        publishedAt: { not: null }
      },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverUrl: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' }
    }),
    prisma.enrollment.findMany({
      where: { userId },
      select: {
        trackId: true,
        progressPct: true
      }
    })
  ])

  const enrollmentMap = new Map(enrollments.map(e => [e.trackId, e.progressPct]))

  return tracks.map(track => ({
    id: track.id,
    slug: track.slug,
    title: track.title,
    description: track.summary,
    coverUrl: track.coverUrl,
    publishedAt: track.publishedAt,
    isEnrolled: enrollmentMap.has(track.id),
    progressPct: enrollmentMap.get(track.id) || 0
  }))
}

// Enhanced progress metrics calculations
async function getEnhancedProgressMetrics(userId: string) {
  const progress = await getUserProgress(userId)
  
  // Calculate learning velocity (lessons per week)
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentProgress = progress.filter(p => p.completedAt && p.completedAt >= oneWeekAgo)
  const learningVelocity = recentProgress.length

  // Calculate total time spent
  const totalTimeSpent = progress.reduce((total, p) => {
    return total + (p.lesson.durationMin || 0)
  }, 0)

  // Calculate consistency score (days with activity vs total days)
  const completedDates = new Set(
    progress
      .map(p => p.completedAt?.toDateString())
      .filter(Boolean)
  )
  
  const enrollmentDate = await prisma.enrollment.findFirst({
    where: { userId },
    select: { startedAt: true },
    orderBy: { startedAt: 'asc' }
  })
  
  const daysSinceStart = enrollmentDate 
    ? Math.ceil((now.getTime() - enrollmentDate.startedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 1
  
  const consistencyScore = daysSinceStart > 0 
    ? Math.round((completedDates.size / Math.min(daysSinceStart, 30)) * 100)
    : 0

  // Calculate retention rate (based on quiz scores if available)
  const retentionRate = 85 // Placeholder - would need quiz data

  return {
    learningVelocity,
    totalTimeSpent,
    consistencyScore,
    retentionRate,
    totalDays: completedDates.size
  }
}

export default async function LearningDashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  const [enrollments, progress, certificates, learningActivity, allCourses, enhancedMetrics] = await Promise.all([
    getUserEnrollments(session.user.id),
    getUserProgress(session.user.id),
    getUserCertificates(session.user.id),
    getLearningActivity(session.user.id),
    getAllCourses(session.user.id),
    getEnhancedProgressMetrics(session.user.id),
  ])

  // Calculate stats
  const totalEnrollments = enrollments.length
  const completedTracks = enrollments.filter(e => e.progressPct === 100).length
  const totalLessonsCompleted = progress.length
  const totalCertificates = certificates.length

  // Calculate streak (consecutive days with completed lessons)
  const completedDates = progress
    .map(p => p.completedAt?.toDateString())
    .filter(Boolean)
    .sort()
    .reverse()

  let streak = 0
  let currentDate = new Date()
  for (let i = 0; i < 30; i++) {
    const dateStr = currentDate.toDateString()
    if (completedDates.includes(dateStr)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
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
              <span className="text-white">My</span>
              <span className="text-yellow-400 ml-4">Learning</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Track your progress and continue your learning journey
            </p>
            <div className="flex items-center justify-center gap-6 text-slate-400">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span className="font-medium">{totalEnrollments} Enrolled Tracks</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{completedTracks} Completed</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                <span className="font-medium">{totalLessonsCompleted} Lessons</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                <span className="font-medium">{totalCertificates} Certificates</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">

        {/* Enhanced Stats */}
        <div className="mb-12">
          <EnhancedStats 
            totalEnrollments={totalEnrollments}
            completedTracks={completedTracks}
            totalLessonsCompleted={totalLessonsCompleted}
            totalCertificates={totalCertificates}
            enhancedMetrics={enhancedMetrics}
          />
        </div>

        {/* Learning Streak */}
        {streak > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl p-6 mb-12">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Learning Streak</h3>
                <p className="text-slate-600">
                  {streak} day{streak !== 1 ? 's' : ''} in a row! Keep it up!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Course Carousel */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Continue Learning</h2>
          <CourseCarousel courses={transformEnrollmentsForCarousel(enrollments)} />
        </div>

        {/* Learning Streak Widget */}
        <div className="mb-12">
          <StreakWidget 
            streak={streak}
            totalLessonsCompleted={totalLessonsCompleted}
            nextLessonUrl={enrollments.length > 0 ? `/learn/${enrollments[0].track.slug}` : undefined}
          />
        </div>

        {/* Smart Notifications */}
        <div className="mb-12">
          <SmartNotifications 
            streak={streak}
            totalLessonsCompleted={totalLessonsCompleted}
            completedTracks={completedTracks}
            nextLessonUrl={enrollments.length > 0 ? `/learn/${enrollments[0].track.slug}` : undefined}
          />
        </div>

        {/* Progress Timeline */}
        <div className="mb-12">
          <ProgressTimeline 
            enrollments={enrollments}
            progress={progress}
            certificates={certificates}
            streak={streak}
          />
        </div>

        {/* Course Recommendations */}
        <div className="mb-12">
          <CourseRecommendations courses={allCourses} />
        </div>

        {/* Course Search */}
        <div className="mb-12">
          <CourseSearch courses={allCourses} />
        </div>

        {/* Real-Time Progress */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="h-6 w-6 text-green-600" />
            Live Progress
          </h2>
          <RealTimeProgress 
            userId={session.user.id}
            showAchievements={true}
            showStreak={true}
          />
        </div>

        {/* Analytics Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Learning Analytics
          </h2>
          <Suspense fallback={<div className="text-center py-8">Loading analytics...</div>}>
            <LearningAnalytics />
          </Suspense>
        </div>

        {/* Enrolled Tracks */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Learning Tracks</h2>
          
          {enrollments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((enrollment) => {
                const track = enrollment.track
                const totalLessons = track.lessons.length
                const totalDuration = track.lessons.reduce((sum, lesson) => sum + (lesson.durationMin || 0), 0)
                
                return (
                  <Card key={enrollment.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200">
                    <CardHeader className="pb-4">
                      {track.coverUrl && (
                        <div className="aspect-video relative mb-4 rounded-xl overflow-hidden">
                          <Image
                            src={track.coverUrl}
                            alt={track.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      )}
                      
                      <CardTitle className="text-xl font-semibold mb-2 text-slate-900">{track.title}</CardTitle>
                      <CardDescription className="text-sm text-slate-600 line-clamp-2">
                        {track.summary}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0">
                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-600">Progress</span>
                          <span className="font-medium">{enrollment.progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div 
                            className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${enrollment.progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{totalLessons} lessons</span>
                        </div>
                        {totalDuration > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{Math.round(totalDuration / 60)}h {totalDuration % 60}m</span>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="mb-4">
                        <Badge 
                          variant={enrollment.progressPct === 100 ? 'default' : 'secondary'}
                          className={enrollment.progressPct === 100 ? 'bg-green-600' : ''}
                        >
                          {enrollment.progressPct === 100 ? 'Completed' : 'In Progress'}
                        </Badge>
                      </div>

                      {/* Action Button */}
                      <Link href={`/learn/${track.slug}`} className="block">
                        <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                          {enrollment.progressPct === 100 ? (
                            <>
                              <Award className="h-4 w-4 mr-2" />
                              View Certificate
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Continue Learning
                            </>
                          )}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Enrolled Tracks</h3>
              <p className="text-slate-600 mb-6">
                Start your learning journey by enrolling in a track.
              </p>
              <Link href="/learn">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-white">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Tracks
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {progress.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Recent Activity</h2>
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-200">
                {progress.slice(0, 10).map((p) => (
                  <div key={p.id} className="p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{p.lesson.title}</p>
                      <p className="text-sm text-slate-600">
                        Completed {p.completedAt ? formatDate(p.completedAt, 'MMM d, yyyy') : 'Unknown'}
                      </p>
                    </div>
                    {p.lesson.durationMin && (
                      <div className="text-sm text-slate-500 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {p.lesson.durationMin}m
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Certificates */}
        {certificates.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Certificates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((certificate) => (
                <Card key={certificate.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Award className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-slate-900">{certificate.track.title}</CardTitle>
                        <CardDescription className="text-slate-600">
                          Completed {formatDate(certificate.issuedAt, 'MMM d, yyyy')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/learn/cert/${certificate.code}`}>
                      <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                        <Award className="h-4 w-4 mr-2" />
                        View Certificate
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
