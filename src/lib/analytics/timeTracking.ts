/**
 * Time tracking analytics functions
 */

import { prisma } from '@/lib/prisma'

/**
 * Get total time spent by user (in milliseconds)
 */
export async function getTotalTimeSpent(userId: string): Promise<number> {
  const aggregate = await prisma.lessonProgress.aggregate({
    where: { userId },
    _sum: { timeSpentMs: true }
  })
  
  return aggregate._sum.timeSpentMs || 0
}

/**
 * Get total time spent in minutes
 */
export async function getTotalTimeSpentMinutes(userId: string): Promise<number> {
  const timeSpentMs = await getTotalTimeSpent(userId)
  return Math.round(timeSpentMs / 1000 / 60)
}

/**
 * Get time spent within a date range (in milliseconds)
 */
export async function getTimeSpentInRange(
  userId: string,
  startDate: Date,
  endDate?: Date
): Promise<number> {
  const aggregate = await prisma.lessonProgress.aggregate({
    where: {
      userId,
      completedAt: {
        gte: startDate,
        ...(endDate ? { lte: endDate } : {})
      }
    },
    _sum: { timeSpentMs: true }
  })
  
  return aggregate._sum.timeSpentMs || 0
}

