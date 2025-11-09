import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { calculateLearningStreak, calculateRetentionRate } from '@/lib/analytics'
import { handleError } from '@/lib/errors'

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
    return handleError(error)
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

  // Calculate learning streak using shared function
  const streak = await calculateLearningStreak(userId)

  // Get progress over time
  const progressOverTime = await getProgressOverTime(userId, days)

  // Get top performing tracks
  const topTracks = await getTopPerformingTracks(userId)

  // Calculate retention rate using shared function
  const retentionRate = await calculateRetentionRate(userId)

  return {
    overview: {
      totalEnrollments,
      completedTracks,
      totalLessonsCompleted,
      totalTimeSpent: totalTimeSpent._sum.timeSpentMs || 0,
      certificates,
      streak,
      retentionRate
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

// calculateLearningStreak is now imported from shared analytics library

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

  // Group by date
  const activityMap = new Map<string, { lessonsCompleted: number; timeSpent: number }>()
  
  dailyProgress.forEach(progress => {
    if (progress.completedAt) {
      const date = progress.completedAt.toISOString().split('T')[0]
      const existing = activityMap.get(date) || { lessonsCompleted: 0, timeSpent: 0 }
      activityMap.set(date, {
        lessonsCompleted: existing.lessonsCompleted + progress._count.lessonId,
        timeSpent: existing.timeSpent + (progress._sum.timeSpentMs || 0)
      })
    }
  })

  return Array.from(activityMap.entries()).map(([date, data]) => ({
    date,
    lessonsCompleted: data.lessonsCompleted,
    timeSpent: data.timeSpent
  }))
}

async function getWeeklyPatterns(userId: string, days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const progress = await prisma.lessonProgress.findMany({
    where: {
      userId,
      completedAt: { gte: startDate }
    },
    select: {
      completedAt: true,
      timeSpentMs: true
    }
  })

  // Group by day of week (0 = Sunday, 1 = Monday, etc.)
  const weeklyPattern = {
    Sunday: { lessonsCompleted: 0, timeSpent: 0 },
    Monday: { lessonsCompleted: 0, timeSpent: 0 },
    Tuesday: { lessonsCompleted: 0, timeSpent: 0 },
    Wednesday: { lessonsCompleted: 0, timeSpent: 0 },
    Thursday: { lessonsCompleted: 0, timeSpent: 0 },
    Friday: { lessonsCompleted: 0, timeSpent: 0 },
    Saturday: { lessonsCompleted: 0, timeSpent: 0 }
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  progress.forEach(p => {
    if (p.completedAt) {
      const dayOfWeek = dayNames[p.completedAt.getDay()]
      weeklyPattern[dayOfWeek as keyof typeof weeklyPattern].lessonsCompleted++
      weeklyPattern[dayOfWeek as keyof typeof weeklyPattern].timeSpent += p.timeSpentMs || 0
    }
  })

  return Object.entries(weeklyPattern).map(([day, data]) => ({
    day,
    lessonsCompleted: data.lessonsCompleted,
    timeSpent: data.timeSpent
  }))
}

async function getLearningVelocity(userId: string, days: number) {
  const now = new Date()
  const periods = [
    { label: '1 week', days: 7 },
    { label: '2 weeks', days: 14 },
    { label: '4 weeks', days: 28 }
  ]

  const velocities = await Promise.all(
    periods.map(async ({ label, days: periodDays }) => {
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
      const count = await prisma.lessonProgress.count({
        where: {
          userId,
          completedAt: { gte: startDate }
        }
      })
      return {
        period: label,
        lessonsCompleted: count,
        lessonsPerWeek: Math.round((count / periodDays) * 7)
      }
    })
  )

  // Calculate trend (comparing current week vs previous week)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  
  const [currentWeek, previousWeek] = await Promise.all([
    prisma.lessonProgress.count({
      where: { userId, completedAt: { gte: oneWeekAgo } }
    }),
    prisma.lessonProgress.count({
      where: { userId, completedAt: { gte: twoWeeksAgo, lt: oneWeekAgo } }
    })
  ])

  const trend = currentWeek > previousWeek ? 'increasing' : currentWeek < previousWeek ? 'decreasing' : 'stable'

  return {
    velocities,
    trend,
    currentWeek,
    previousWeek
  }
}

async function getDifficultyAnalysis(userId: string, days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const progress = await prisma.lessonProgress.findMany({
    where: {
      userId,
      completedAt: { gte: startDate }
    },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          durationMin: true
        }
      }
    }
  })

  // Analyze time spent vs expected duration to identify difficult lessons
  const analysis = progress
    .filter(p => p.lesson.durationMin && p.timeSpentMs)
    .map(p => {
      const expectedMs = p.lesson.durationMin! * 60 * 1000
      const actualMs = p.timeSpentMs
      const difficultyRatio = actualMs / expectedMs // > 1 = took longer (harder), < 1 = faster (easier)
      
      return {
        lessonId: p.lesson.id,
        lessonTitle: p.lesson.title,
        expectedTime: expectedMs,
        actualTime: actualMs,
        difficultyRatio,
        difficulty: difficultyRatio > 1.5 ? 'difficult' : difficultyRatio < 0.75 ? 'easy' : 'medium'
      }
    })

  // Calculate average difficulty
  const avgDifficulty = analysis.length > 0
    ? analysis.reduce((sum, a) => sum + a.difficultyRatio, 0) / analysis.length
    : 1

  return {
    averageDifficulty: avgDifficulty,
    lessons: analysis.sort((a, b) => b.difficultyRatio - a.difficultyRatio).slice(0, 10) // Top 10 most difficult
  }
}

async function getTimeDistribution(userId: string, days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get time distribution by track
  const trackDistribution = await prisma.lessonProgress.groupBy({
    by: ['lessonId'],
    where: {
      userId,
      completedAt: { gte: startDate }
    },
    _sum: { timeSpentMs: true },
    _count: { id: true }
  })

  // Get lesson details to group by track
  const lessonIds = trackDistribution.map(t => t.lessonId)
  const lessons = await prisma.lesson.findMany({
    where: { id: { in: lessonIds } },
    select: { id: true, trackId: true, track: { select: { id: true, title: true } } }
  })

  const lessonMap = new Map(lessons.map(l => [l.id, l.track]))
  
  // Group by track
  const trackMap = new Map<string, { trackTitle: string; timeSpent: number; lessonCount: number }>()
  
  trackDistribution.forEach(dist => {
    const track = lessonMap.get(dist.lessonId)
    if (track) {
      const existing = trackMap.get(track.id) || { trackTitle: track.title, timeSpent: 0, lessonCount: 0 }
      trackMap.set(track.id, {
        trackTitle: track.title,
        timeSpent: existing.timeSpent + (dist._sum.timeSpentMs || 0),
        lessonCount: existing.lessonCount + dist._count.id
      })
    }
  })

  const totalTime = Array.from(trackMap.values()).reduce((sum, t) => sum + t.timeSpent, 0)

  return Array.from(trackMap.values()).map(track => ({
    trackTitle: track.trackTitle,
    timeSpent: track.timeSpent,
    timePercentage: totalTime > 0 ? Math.round((track.timeSpent / totalTime) * 100) : 0,
    lessonCount: track.lessonCount
  }))
}
