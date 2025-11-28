/**
 * Shared analytics functions for user metrics
 * Ensures consistency between server-side and API calculations
 */

import { prisma } from '@/lib/prisma'

export interface UserMetrics {
  totalEnrollments: number
  completedTracks: number
  totalLessonsCompleted: number
  totalTimeSpent: number // in milliseconds
  certificates: number
  retentionRate: number
}

export interface EnhancedMetrics {
  learningVelocity: number
  totalTimeSpent: number // in minutes
  consistencyScore: number
  retentionRate: number
  totalDays: number
}

/**
 * Get basic user metrics
 */
export async function getUserMetrics(userId: string): Promise<UserMetrics> {
  const [
    totalEnrollments,
    completedTracks,
    totalLessonsCompleted,
    totalTimeSpent,
    certificates,
    retentionRate
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
    calculateRetentionRate(userId)
  ])

  return {
    totalEnrollments,
    completedTracks,
    totalLessonsCompleted,
    totalTimeSpent: totalTimeSpent._sum.timeSpentMs || 0,
    certificates,
    retentionRate
  }
}

/**
 * Calculate retention rate from quiz submissions
 * Falls back to lesson completion rate if no quizzes exist
 * Exported as main retention calculation function
 */
export async function calculateRetentionRate(
  userId: string,
  fallbackProgress?: Array<{ completedAt: Date | null }>
): Promise<number> {
  const quizStats = await prisma.quizSubmission.groupBy({
    by: ['passed'],
    where: { userId },
    _count: { id: true }
  })
  
  const totalQuizzes = quizStats.reduce((sum, stat) => sum + stat._count.id, 0)
  const passedQuizzes = quizStats.find(stat => stat.passed)?._count.id || 0
  
  // Calculate retention rate: (Passed Quizzes / Total Quizzes) * 100
  if (totalQuizzes > 0) {
    return Math.round((passedQuizzes / totalQuizzes) * 100)
  }
  
  // Fallback: Use lesson completion rate if no quizzes exist
  if (fallbackProgress && fallbackProgress.length > 0) {
    const completedLessons = fallbackProgress.filter(p => p.completedAt).length
    return Math.round((completedLessons / fallbackProgress.length) * 100)
  }
  
  // Default fallback
  return 85
}

/**
 * Get enhanced progress metrics including velocity and consistency
 */
export async function getEnhancedMetrics(userId: string): Promise<EnhancedMetrics> {
  const progress = await prisma.lessonProgress.findMany({
    where: { userId },
    select: {
      completedAt: true,
      lesson: {
        select: {
          durationMin: true
        }
      }
    }
  })
  
  // Calculate learning velocity (lessons per week)
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentProgress = progress.filter(p => p.completedAt && p.completedAt >= oneWeekAgo)
  const learningVelocity = recentProgress.length

  // Calculate total time spent from lesson duration (since timeSpentMs was removed)
  const totalTimeSpent = progress.reduce((sum, p) => {
    return sum + (p.lesson.durationMin || 0)
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

  // Calculate retention rate
  const retentionRate = await calculateRetentionRate(userId, progress)

  return {
    learningVelocity,
    totalTimeSpent,
    consistencyScore,
    retentionRate,
    totalDays: completedDates.size
  }
}

