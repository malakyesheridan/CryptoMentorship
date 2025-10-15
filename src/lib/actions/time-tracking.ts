'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-server'

interface TimeTrackingData {
  lessonId: string
  timeSpentMs: number
  startTime?: Date
  endTime?: Date
  sessionType?: 'lesson' | 'quiz' | 'review'
}

interface SessionData {
  id: string
  userId: string
  lessonId: string
  startTime: Date
  endTime?: Date
  timeSpentMs: number
  sessionType: 'lesson' | 'quiz' | 'review'
  createdAt: Date
}

// Create a new learning session
export async function startLearningSession(lessonId: string, sessionType: 'lesson' | 'quiz' | 'review' = 'lesson') {
  const user = await requireUser()

  const session = await prisma.learningSession.create({
    data: {
      userId: user.id,
      lessonId,
      startTime: new Date(),
      sessionType,
      timeSpentMs: 0
    }
  })

  return session
}

// End a learning session
export async function endLearningSession(sessionId: string) {
  const user = await requireUser()

  const session = await prisma.learningSession.findFirst({
    where: {
      id: sessionId,
      userId: user.id,
      endTime: null
    }
  })

  if (!session) {
    throw new Error('Session not found or already ended')
  }

  const endTime = new Date()
  const timeSpentMs = endTime.getTime() - session.startTime.getTime()

  const updatedSession = await prisma.learningSession.update({
    where: { id: sessionId },
    data: {
      endTime,
      timeSpentMs
    }
  })

  // Update lesson progress with total time spent
  await updateLessonTimeSpent(user.id, session.lessonId)

  return updatedSession
}

// Update lesson progress with total time spent
async function updateLessonTimeSpent(userId: string, lessonId: string) {
  const totalTimeSpent = await prisma.learningSession.aggregate({
    where: {
      userId,
      lessonId,
      endTime: { not: null }
    },
    _sum: {
      timeSpentMs: true
    }
  })

  const totalMs = totalTimeSpent._sum.timeSpentMs || 0

  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId,
        lessonId
      }
    },
    create: {
      userId,
      lessonId,
      timeSpentMs: totalMs
    },
    update: {
      timeSpentMs: totalMs
    }
  })

  return totalMs
}

// Get detailed time tracking for a lesson
export async function getLessonTimeTracking(userId: string, lessonId: string) {
  const sessions = await prisma.learningSession.findMany({
    where: {
      userId,
      lessonId
    },
    orderBy: {
      startTime: 'desc'
    }
  })

  const totalTimeSpent = sessions.reduce((sum, session) => sum + session.timeSpentMs, 0)
  const activeSession = sessions.find(session => !session.endTime)

  return {
    sessions,
    totalTimeSpent,
    activeSession,
    sessionCount: sessions.length
  }
}

// Get time tracking analytics for a user
export async function getTimeTrackingAnalytics(userId: string, timeframe: string = '30d') {
  const days = getTimeframeDays(timeframe)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const [
    totalTimeSpent,
    dailyTimeSpent,
    sessionStats,
    topLessons,
    learningPatterns
  ] = await Promise.all([
    getTotalTimeSpent(userId, startDate),
    getDailyTimeSpent(userId, startDate),
    getSessionStats(userId, startDate),
    getTopLessonsByTime(userId, startDate),
    getLearningPatterns(userId, startDate)
  ])

  return {
    totalTimeSpent,
    dailyTimeSpent,
    sessionStats,
    topLessons,
    learningPatterns
  }
}

// Get time tracking for a track
export async function getTrackTimeTracking(userId: string, trackId: string) {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
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
  })

  if (!track) {
    throw new Error('Track not found')
  }

  const trackStats = track.lessons.map(lesson => {
    const totalTimeSpent = lesson.progresses.reduce((sum, progress) => sum + progress.timeSpentMs, 0)
    const sessionCount = lesson.progresses.length
    const isCompleted = lesson.progresses.some(p => p.completedAt)

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonSlug: lesson.slug,
      totalTimeSpent,
      sessionCount,
      isCompleted,
      averageSessionTime: sessionCount > 0 ? totalTimeSpent / sessionCount : 0
    }
  })

  const totalTrackTime = trackStats.reduce((sum, lesson) => sum + lesson.totalTimeSpent, 0)
  const completedLessons = trackStats.filter(lesson => lesson.isCompleted).length
  const totalLessons = trackStats.length

  return {
    trackId: track.id,
    trackTitle: track.title,
    totalTrackTime,
    completedLessons,
    totalLessons,
    lessonStats: trackStats
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

async function getTotalTimeSpent(userId: string, startDate: Date) {
  const result = await prisma.learningSession.aggregate({
    where: {
      userId,
      startTime: { gte: startDate },
      endTime: { not: null }
    },
    _sum: {
      timeSpentMs: true
    }
  })

  return result._sum.timeSpentMs || 0
}

async function getDailyTimeSpent(userId: string, startDate: Date) {
  const sessions = await prisma.learningSession.findMany({
    where: {
      userId,
      startTime: { gte: startDate },
      endTime: { not: null }
    },
    select: {
      startTime: true,
      timeSpentMs: true
    }
  })

  // Group by date
  const dailyMap = new Map<string, number>()
  
  sessions.forEach(session => {
    const date = session.startTime.toISOString().split('T')[0]
    const current = dailyMap.get(date) || 0
    dailyMap.set(date, current + session.timeSpentMs)
  })

  return Array.from(dailyMap.entries()).map(([date, timeSpent]) => ({
    date,
    timeSpent
  }))
}

async function getSessionStats(userId: string, startDate: Date) {
  const [
    totalSessions,
    averageSessionTime,
    longestSession,
    shortestSession
  ] = await Promise.all([
    prisma.learningSession.count({
      where: {
        userId,
        startTime: { gte: startDate },
        endTime: { not: null }
      }
    }),
    prisma.learningSession.aggregate({
      where: {
        userId,
        startTime: { gte: startDate },
        endTime: { not: null }
      },
      _avg: {
        timeSpentMs: true
      }
    }),
    prisma.learningSession.findFirst({
      where: {
        userId,
        startTime: { gte: startDate },
        endTime: { not: null }
      },
      orderBy: {
        timeSpentMs: 'desc'
      },
      include: {
        lesson: {
          select: { title: true }
        }
      }
    }),
    prisma.learningSession.findFirst({
      where: {
        userId,
        startTime: { gte: startDate },
        endTime: { not: null }
      },
      orderBy: {
        timeSpentMs: 'asc'
      },
      include: {
        lesson: {
          select: { title: true }
        }
      }
    })
  ])

  return {
    totalSessions,
    averageSessionTime: averageSessionTime._avg.timeSpentMs || 0,
    longestSession,
    shortestSession
  }
}

async function getTopLessonsByTime(userId: string, startDate: Date) {
  const lessons = await prisma.learningSession.groupBy({
    by: ['lessonId'],
    where: {
      userId,
      startTime: { gte: startDate },
      endTime: { not: null }
    },
    _sum: {
      timeSpentMs: true
    },
    _count: {
      id: true
    },
    orderBy: {
      _sum: {
        timeSpentMs: 'desc'
      }
    },
    take: 10
  })

  const lessonIds = lessons.map(l => l.lessonId)
  const lessonDetails = await prisma.lesson.findMany({
    where: { id: { in: lessonIds } },
    select: { id: true, title: true, slug: true }
  })

  return lessons.map(lesson => {
    const details = lessonDetails.find(d => d.id === lesson.lessonId)
    return {
      lessonId: lesson.lessonId,
      lessonTitle: details?.title || 'Unknown',
      lessonSlug: details?.slug || '',
      totalTimeSpent: lesson._sum.timeSpentMs || 0,
      sessionCount: lesson._count.id
    }
  })
}

async function getLearningPatterns(userId: string, startDate: Date) {
  const sessions = await prisma.learningSession.findMany({
    where: {
      userId,
      startTime: { gte: startDate },
      endTime: { not: null }
    },
    select: {
      startTime: true,
      sessionType: true,
      timeSpentMs: true
    }
  })

  // Analyze patterns by hour of day
  const hourlyPatterns = new Map<number, number>()
  const typePatterns = new Map<string, number>()

  sessions.forEach(session => {
    const hour = session.startTime.getHours()
    const current = hourlyPatterns.get(hour) || 0
    hourlyPatterns.set(hour, current + session.timeSpentMs)

    const type = session.sessionType
    const typeCurrent = typePatterns.get(type) || 0
    typePatterns.set(type, typeCurrent + session.timeSpentMs)
  })

  return {
    hourlyPatterns: Array.from(hourlyPatterns.entries()).map(([hour, timeSpent]) => ({
      hour,
      timeSpent
    })),
    typePatterns: Array.from(typePatterns.entries()).map(([type, timeSpent]) => ({
      type,
      timeSpent
    }))
  }
}
