import { requireAuth } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { LearningHubContent } from '@/components/learning/LearningHubContent'
import { unstable_cache } from 'next/cache'

export const revalidate = 30

async function getUserEnrollments(userId: string) {
  const getCachedEnrollments = unstable_cache(
    async () => {
      const { prisma } = await import('@/lib/prisma')
      return await prisma.enrollment.findMany({
        where: { userId },
        take: 50,
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
          { progressPct: 'desc' },
          { startedAt: 'desc' }
        ],
      })
    },
    [`user-enrollments-${userId}`],
    { revalidate: 300, tags: [`user-enrollments-${userId}`, 'user-enrollments-*'] }
  )
  return getCachedEnrollments()
}

async function getUserProgress(userId: string) {
  const getCachedProgress = unstable_cache(
    async () => {
      const { prisma } = await import('@/lib/prisma')
      return await prisma.lessonProgress.findMany({
        where: { userId },
        take: 100,
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
    { revalidate: 300 }
  )
  return getCachedProgress()
}

async function getUserCertificates(userId: string) {
  const getCachedCertificates = unstable_cache(
    async () => {
      const { prisma } = await import('@/lib/prisma')
      return await prisma.certificate.findMany({
        where: { userId },
        take: 50,
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
    { revalidate: 300 }
  )
  return getCachedCertificates()
}

async function getAllCourses(userId: string) {
  const getCachedAllCourses = unstable_cache(
    async () => {
      const { prisma } = await import('@/lib/prisma')
      const [tracks, enrollments] = await Promise.all([
        prisma.track.findMany({
          where: {
            publishedAt: { not: null }
          },
          take: 100,
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
    { revalidate: 300, tags: [`all-courses-${userId}`, 'all-courses-*'] }
  )
  return getCachedAllCourses()
}

export default async function LearningDashboardPage() {
  const user = await requireAuth()

  try {
    const results = await Promise.allSettled([
      getUserEnrollments(user.id),
      getUserProgress(user.id),
      getUserCertificates(user.id),
      getAllCourses(user.id),
    ])

    const enrollments = results[0].status === 'fulfilled' ? results[0].value : []
    const progress = results[1].status === 'fulfilled' ? results[1].value : []
    const certificates = results[2].status === 'fulfilled' ? results[2].value : []
    const allCourses = results[3].status === 'fulfilled' ? results[3].value : []

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Error fetching data at index ${index}:`, result.reason)
      }
    })

    // Calculate streak (consecutive days with completed lessons)
    const completedDates = (progress
      .map(p => {
        if (!p.completedAt) return null
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
      <div className="min-h-screen bg-[var(--bg-page)]">
        <div className="container mx-auto px-4 py-8">
          <LearningHubContent
            enrollments={enrollments}
            progress={progress}
            certificates={certificates}
            allCourses={allCourses}
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
      <div className="min-h-screen bg-[var(--bg-page)]">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-[var(--text-strong)] mb-4">Learning Hub</h1>
          <p className="text-[var(--text-muted)] mb-8">Unable to load learning data at this time. Please try again later.</p>
        </div>
      </div>
    )
  }
}
