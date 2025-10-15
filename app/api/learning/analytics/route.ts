import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = new URL(req.url)
  const type = url.searchParams.get('type') || 'overview'
  const trackId = url.searchParams.get('trackId')
  const timeframe = url.searchParams.get('timeframe') || '30d'

  try {
    let analytics

    switch (type) {
      case 'overview':
        analytics = await getOverviewAnalytics(session.user.id, timeframe)
        break
      case 'track':
        if (!trackId) {
          return new Response('Track ID required', { status: 400 })
        }
        analytics = await getTrackAnalytics(session.user.id, trackId, timeframe)
        break
      case 'detailed':
        analytics = await getDetailedAnalytics(session.user.id, timeframe)
        break
      default:
        return new Response('Invalid analytics type', { status: 400 })
    }

    return Response.json(analytics)
  } catch (error) {
    console.error('Analytics error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

async function getOverviewAnalytics(userId: string, timeframe: string) {
  const days = getTimeframeDays(timeframe)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get basic stats
  const [
    totalEnrollments,
    completedTracks,
    totalLessonsCompleted,
    totalTimeSpent,
    certificates,
    recentActivity
  ] = await Promise.all([
    prisma.enrollment.count({ where: { userId } }),
    prisma.enrollment.count({ 
      where: { 
        userId, 
        completedAt: { not: null } 
      } 
    }),
    prisma.lessonProgress.count({ 
      where: { 
        userId, 
        completedAt: { not: null } 
      } 
    }),
    prisma.lessonProgress.aggregate({
      where: { userId },
      _sum: { timeSpentMs: true }
    }),
    prisma.certificate.count({ where: { userId } }),
    prisma.lessonProgress.findMany({
      where: {
        userId,
        completedAt: { gte: startDate }
      },
      include: {
        lesson: {
          select: {
            title: true,
            track: {
              select: { title: true, slug: true }
            }
          }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: 10
    })
  ])

  // Calculate learning streak
  const streak = await calculateLearningStreak(userId)

  // Get progress over time
  const progressOverTime = await getProgressOverTime(userId, days)

  // Get top performing tracks
  const topTracks = await getTopPerformingTracks(userId)

  return {
    overview: {
      totalEnrollments,
      completedTracks,
      totalLessonsCompleted,
      totalTimeSpent: totalTimeSpent._sum.timeSpentMs || 0,
      certificates,
      streak
    },
    recentActivity,
    progressOverTime,
    topTracks
  }
}

async function getTrackAnalytics(userId: string, trackId: string, timeframe: string) {
  const days = getTimeframeDays(timeframe)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get track details
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      sections: {
        include: {
          lessons: {
            where: { publishedAt: { not: null } },
            include: {
              progresses: {
                where: { userId }
              }
            }
          }
        }
      }
    }
  })

  if (!track) {
    throw new Error('Track not found')
  }

  // Get enrollment details
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_trackId: { userId, trackId }
    }
  })

  // Calculate section progress
  const sectionProgress = track.sections.map(section => {
    const totalLessons = section.lessons.length
    const completedLessons = section.lessons.filter(lesson => 
      lesson.progresses.some(p => p.completedAt)
    ).length
    
    return {
      sectionId: section.id,
      sectionTitle: section.title,
      totalLessons,
      completedLessons,
      progressPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    }
  })

  // Get time spent per lesson
  const lessonTimeSpent = await prisma.lessonProgress.findMany({
    where: {
      userId,
      lesson: { trackId },
      completedAt: { gte: startDate }
    },
    include: {
      lesson: {
        select: { title: true, slug: true }
      }
    },
    orderBy: { completedAt: 'desc' }
  })

  // Get progress timeline
  const progressTimeline = await getTrackProgressTimeline(userId, trackId, days)

  return {
    track: {
      id: track.id,
      title: track.title,
      description: track.description,
      progressPct: enrollment?.progressPct || 0,
      startedAt: enrollment?.startedAt,
      completedAt: enrollment?.completedAt
    },
    sectionProgress,
    lessonTimeSpent,
    progressTimeline
  }
}

async function getDetailedAnalytics(userId: string, timeframe: string) {
  const days = getTimeframeDays(timeframe)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get detailed learning patterns
  const [
    dailyActivity,
    weeklyPatterns,
    learningVelocity,
    difficultyAnalysis,
    timeDistribution
  ] = await Promise.all([
    getDailyActivity(userId, days),
    getWeeklyPatterns(userId, days),
    getLearningVelocity(userId, days),
    getDifficultyAnalysis(userId, days),
    getTimeDistribution(userId, days)
  ])

  return {
    dailyActivity,
    weeklyPatterns,
    learningVelocity,
    difficultyAnalysis,
    timeDistribution
  }
}

// Helper functions
function getTimeframeDays(timeframe: string): number {
  switch (timeframe) {
    case '7d': return 7
    case '30d': return 30
    case '90d': return 90
    case '1y': return 365
    default: return 30
  }
}

async function calculateLearningStreak(userId: string): Promise<number> {
  const completedDates = await prisma.lessonProgress.findMany({
    where: {
      userId,
      completedAt: { not: null }
    },
    select: { completedAt: true },
    orderBy: { completedAt: 'desc' }
  })

  const uniqueDates = Array.from(new Set(
    completedDates.map(p => p.completedAt?.toDateString())
  )).filter(Boolean).sort().reverse()

  let streak = 0
  let currentDate = new Date()
  
  for (let i = 0; i < 30; i++) {
    const dateStr = currentDate.toDateString()
    if (uniqueDates.includes(dateStr)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

async function getProgressOverTime(userId: string, days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const dailyProgress = await prisma.lessonProgress.groupBy({
    by: ['completedAt'],
    where: {
      userId,
      completedAt: { gte: startDate }
    },
    _count: { lessonId: true },
    _sum: { timeSpentMs: true }
  })

  // Group by date and format
  const progressMap = new Map()
  dailyProgress.forEach(progress => {
    if (progress.completedAt) {
      const date = progress.completedAt.toISOString().split('T')[0]
      progressMap.set(date, {
        lessonsCompleted: progress._count.lessonId,
        timeSpent: progress._sum.timeSpentMs || 0
      })
    }
  })

  return Array.from(progressMap.entries()).map(([date, data]) => ({
    date,
    ...data
  }))
}

async function getTopPerformingTracks(userId: string) {
  const trackStats = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      track: {
        select: { title: true, slug: true }
      }
    },
    orderBy: { progressPct: 'desc' },
    take: 5
  })

  return trackStats.map(enrollment => ({
    trackId: enrollment.trackId,
    trackTitle: enrollment.track.title,
    trackSlug: enrollment.track.slug,
    progressPct: enrollment.progressPct,
    startedAt: enrollment.startedAt,
    completedAt: enrollment.completedAt
  }))
}

async function getTrackProgressTimeline(userId: string, trackId: string, days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const timeline = await prisma.lessonProgress.findMany({
    where: {
      userId,
      lesson: { trackId },
      completedAt: { gte: startDate }
    },
    include: {
      lesson: {
        select: { title: true, slug: true }
      }
    },
    orderBy: { completedAt: 'asc' }
  })

  return timeline.map(progress => ({
    date: progress.completedAt?.toISOString(),
    lessonTitle: progress.lesson.title,
    lessonSlug: progress.lesson.slug,
    timeSpent: progress.timeSpentMs
  }))
}

async function getDailyActivity(userId: string, days: number) {
  // Implementation for daily activity patterns
  return []
}

async function getWeeklyPatterns(userId: string, days: number) {
  // Implementation for weekly learning patterns
  return []
}

async function getLearningVelocity(userId: string, days: number) {
  // Implementation for learning velocity analysis
  return {}
}

async function getDifficultyAnalysis(userId: string, days: number) {
  // Implementation for difficulty analysis
  return {}
}

async function getTimeDistribution(userId: string, days: number) {
  // Implementation for time distribution analysis
  return {}
}
