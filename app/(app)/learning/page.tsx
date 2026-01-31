import { Suspense } from 'react'
import { requireAuth } from '@/lib/access'
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
import { LearningHubWizard } from '@/components/learning/LearningHubWizard'
import { unstable_cache } from 'next/cache'

// Revalidate every 30 seconds for faster updates (especially for admin edits)
// This ensures track edits appear within 30 seconds instead of 5 minutes
export const revalidate = 30

// Cache resources for 5 minutes with tag for targeted invalidation
const getCachedResources = unstable_cache(
  async () => {
    try {
      const { prisma } = await import('@/lib/prisma')
      const resources = await prisma.content.findMany({
        where: { kind: 'resource' },
        orderBy: { publishedAt: 'desc' },
        take: 50, // Limit to 50 most recent resources
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
  },
  ['learning-resources'],
  { revalidate: 300, tags: ['learning-resources'] }
)

// Fetch resources for Learning Hub
async function getResources() {
  return getCachedResources()
}

// ✅ Cache enrollments query for 5 minutes (per-user) with tag for targeted invalidation
async function getUserEnrollments(userId: string) {
  const getCachedEnrollments = unstable_cache(
    async () => {
      const { prisma } = await import('@/lib/prisma')
      return await prisma.enrollment.findMany({
        where: { userId },
        take: 50, // Limit to 50 most recent enrollments
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
    },
    [`user-enrollments-${userId}`],
    { revalidate: 300, tags: [`user-enrollments-${userId}`, 'user-enrollments-*'] } // 5 minutes
  )
  return getCachedEnrollments()
}

// ✅ Cache progress query for 5 minutes (per-user)
async function getUserProgress(userId: string) {
  const getCachedProgress = unstable_cache(
    async () => {
      const { prisma } = await import('@/lib/prisma')
      return await prisma.lessonProgress.findMany({
        where: { userId },
        take: 100, // Limit to 100 most recent progress records
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
    },
    [`user-progress-${userId}`],
    { revalidate: 300 } // 5 minutes
  )
  return getCachedProgress()
}

// ✅ Cache certificates query for 5 minutes (per-user)
async function getUserCertificates(userId: string) {
  const getCachedCertificates = unstable_cache(
    async () => {
      const { prisma } = await import('@/lib/prisma')
      return await prisma.certificate.findMany({
        where: { userId },
        take: 50, // Limit to 50 most recent certificates
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
    },
    [`user-certificates-${userId}`],
    { revalidate: 300 } // 5 minutes
  )
  return getCachedCertificates()
}

// ✅ Cache learning activity query for 5 minutes (per-user)
async function getLearningActivity(userId: string, days: number = 7) {
  const getCachedLearningActivity = unstable_cache(
    async () => {
      const { prisma } = await import('@/lib/prisma')
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
          // Handle both Date objects and strings
          const dateObj = item.completedAt instanceof Date 
            ? item.completedAt 
            : new Date(item.completedAt)
          const date = dateObj.toISOString().split('T')[0]
          acc[date] = (acc[date] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      return Object.entries(activityByDate).map(([date, count]) => ({
        date,
        count
      }))
    },
    [`learning-activity-${userId}-${days}`],
    { revalidate: 300 } // 5 minutes
  )
  return getCachedLearningActivity()
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

// ✅ Cache all courses query for 5 minutes (per-user for enrollment data) with tag for targeted invalidation
async function getAllCourses(userId: string) {
  const getCachedAllCourses = unstable_cache(
    async () => {
      const { prisma } = await import('@/lib/prisma')
      const [tracks, enrollments] = await Promise.all([
        prisma.track.findMany({
          where: {
            publishedAt: { not: null }
          },
          take: 100, // Limit to 100 most recent tracks
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
    },
    [`all-courses-${userId}`],
    { revalidate: 300, tags: [`all-courses-${userId}`, 'all-courses-*'] } // 5 minutes
  )
  return getCachedAllCourses()
}

// ✅ Cache enhanced metrics query for 5 minutes (per-user)
async function getEnhancedProgressMetrics(userId: string) {
  const getCachedEnhancedMetrics = unstable_cache(
    async () => {
      const { getEnhancedMetrics } = await import('@/lib/analytics')
      return await getEnhancedMetrics(userId)
    },
    [`enhanced-metrics-${userId}`],
    { revalidate: 300 } // 5 minutes
  )
  return getCachedEnhancedMetrics()
}

export default async function LearningDashboardPage() {
  const user = await requireAuth()

  try {
    // Fetch data with individual error handling to prevent one failure from breaking the page
    const results = await Promise.allSettled([
      getUserEnrollments(user.id),
      getUserProgress(user.id),
      getUserCertificates(user.id),
      getLearningActivity(user.id),
      getAllCourses(user.id),
      getEnhancedProgressMetrics(user.id),
      getResources(),
    ])
    
    const enrollments = results[0].status === 'fulfilled' ? results[0].value : []
    const progress = results[1].status === 'fulfilled' ? results[1].value : []
    const certificates = results[2].status === 'fulfilled' ? results[2].value : []
    const learningActivity = results[3].status === 'fulfilled' ? results[3].value : []
    const allCourses = results[4].status === 'fulfilled' ? results[4].value : []
    const enhancedMetrics = results[5].status === 'fulfilled' ? results[5].value : { learningVelocity: 0, totalTimeSpent: 0, consistencyScore: 0, retentionRate: 0, totalDays: 0 }
    const resources = results[6].status === 'fulfilled' ? results[6].value : []
    
    // Log any errors for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Error fetching data at index ${index}:`, result.reason)
      }
    })

    // Calculate stats
    const totalEnrollments = enrollments.length
    const completedTracks = enrollments.filter(e => e.progressPct === 100).length
  const totalLessonsCompleted = progress.length
  const totalCertificates = certificates.length

  // Calculate streak (consecutive days with completed lessons)
  const completedDates = (progress
    .map(p => {
      if (!p.completedAt) return null
      // Handle both Date objects and ISO strings
      const date = p.completedAt instanceof Date ? p.completedAt : new Date(p.completedAt)
      return date.toDateString()
    })
    .filter(Boolean) as string[])
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
      <LearningHubWizard />
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-bold mb-6 leading-tight">
              <span className="text-white">Learning</span>
              <span className="text-yellow-400 block sm:inline sm:ml-4">Hub</span>
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
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{completedTracks} Completed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Admin Quick Actions Widget */}
        {['admin', 'editor'].includes(user.role || '') && (
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
          userId={user.id}
          userRole={user.role || 'guest'}
          userTier={(user as any)?.membershipTier || null}
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
