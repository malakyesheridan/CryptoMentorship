/**
 * Learning streak calculations
 */

import { prisma } from '@/lib/prisma'

/**
 * Calculate learning streak (consecutive days with completed lessons)
 */
export async function calculateLearningStreak(userId: string): Promise<number> {
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
  
  // Check up to 30 days back
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

