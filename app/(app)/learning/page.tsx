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
  Activity,
  FileText,
  Plus
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
import { LearningHubContent } from '@/components/learning/LearningHubContent'
import { getEnhancedMetrics } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

// Fetch resources for Learning Hub
async function getResources() {
  try {
    const resources = await prisma.content.findMany({
      where: { kind: 'resource' },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverUrl: true,
        tags: true,
        publishedAt: true,
        locked: true,
        kind: true,
        minTier: true,
      }
    })

    return resources.map((resource) => ({
      id: resource.id,
      slug: resource.slug ?? resource.id,
      title: resource.title,
      description: resource.excerpt ?? null,
      coverUrl: resource.coverUrl ?? '/images/placeholders/resource-cover.jpg',
      tags: resource.tags ?? null,
      publishedAt: resource.publishedAt ?? null,
      locked: resource.locked,
      kind: resource.kind,
      minTier: resource.minTier,
    }))
  } catch (error) {
    console.error('Error fetching resources:', error)
    return []
  }
}

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

async function getEnhancedProgressMetrics(userId: string) {
  // Use shared analytics function for consistency
  return await getEnhancedMetrics(userId)
}

export default async function LearningDashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  try {
    const [enrollments, progress, certificates, learningActivity, allCourses, enhancedMetrics, resources] = await Promise.all([
      getUserEnrollments(session.user.id),
      getUserProgress(session.user.id),
      getUserCertificates(session.user.id),
      getLearningActivity(session.user.id),
      getAllCourses(session.user.id),
      getEnhancedProgressMetrics(session.user.id),
      getResources(),
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
              <span className="text-white">Learning</span>
              <span className="text-yellow-400 ml-4">Hub</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Your central hub for learning tracks, resources, and progress
            </p>
            <div className="flex items-center justify-center gap-6 text-slate-400 flex-wrap">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span className="font-medium">{totalEnrollments} Learning Tracks</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span className="font-medium">{resources.length} Resources</span>
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
        {/* Admin Quick Actions Widget */}
        {['admin', 'editor'].includes(session.user.role || '') && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Admin Quick Actions</h2>
                  <p className="text-sm text-slate-600">
                    Manage learning tracks, sections, and lessons
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link href="/admin/learn/tracks">
                    <Button variant="outline">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Manage Tracks
                    </Button>
                  </Link>
                  <Link href="/admin/learn/tracks/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Track
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <LearningHubContent
          enrollments={enrollments}
          progress={progress}
          certificates={certificates}
          learningActivity={learningActivity}
          allCourses={allCourses}
          enhancedMetrics={enhancedMetrics}
          resources={resources}
          streak={streak}
          userId={session.user.id}
          userRole={session.user.role || 'guest'}
          userTier={(session.user as any)?.membershipTier || null}
        />
      </div>
    </div>
  )
  } catch (error) {
    console.error('Error fetching learning data:', error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Learning Hub</h1>
          <p className="text-slate-600 mb-8">Unable to load learning data at this time. Please try again later.</p>
        </div>
      </div>
    )
  }
}
