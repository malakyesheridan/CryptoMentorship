import { prisma } from '@/lib/prisma'

export interface LessonAccessInfo {
  canAccess: boolean
  releaseAt?: Date
  isLocked: boolean
  cohortId?: string
}

/**
 * Check if a user can access a lesson based on cohort enrollment and release schedule
 */
export async function checkLessonAccess(
  _userId: string,
  lessonId: string,
  trackId: string
): Promise<LessonAccessInfo> {
  // Ensure lesson belongs to track and is published
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      publishedAt: true,
      trackId: true,
    },
  })

  if (!lesson || !lesson.publishedAt || lesson.trackId !== trackId) {
    return { canAccess: false, isLocked: true }
  }

  return { canAccess: true, isLocked: false }
}

/**
 * Get all accessible lessons for a user in a track (considering cohort releases)
 */
export async function getAccessibleLessons(userId: string, trackId: string) {
  // Get all published lessons in the track
  const allLessons = await prisma.lesson.findMany({
    where: {
      trackId,
      publishedAt: { not: null },
    },
    include: {
      releases: {
        include: {
          cohort: {
            include: {
              enrollments: {
                where: { userId },
              },
            },
          },
        },
      },
    },
    orderBy: { order: 'asc' },
  })

  return allLessons.map(lesson => ({
    ...lesson,
    canAccess: true,
    isLocked: false,
    releaseAt: null,
  }))
}

/**
 * Get cohort progress for a user (only counting released lessons)
 */
export async function getCohortProgress(userId: string, cohortId: string) {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: {
      track: {
        select: { id: true },
      },
    },
  })

  if (!cohort) {
    throw new Error('Cohort not found')
  }

  const now = new Date()

  // Get all released lessons for this cohort
  const releasedLessons = await prisma.lessonRelease.findMany({
    where: {
      cohortId,
      releaseAt: { lte: now },
    },
    include: {
      lesson: {
        select: {
          id: true,
          publishedAt: true,
        },
      },
    },
  })

  // Filter to only published lessons
  const publishedReleasedLessons = releasedLessons.filter(
    release => release.lesson.publishedAt
  )

  // Count completed lessons
  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      lesson: {
        id: { in: publishedReleasedLessons.map(r => r.lesson.id) },
        publishedAt: { not: null },
      },
      completedAt: { not: null },
    },
  })

  const totalReleasedLessons = publishedReleasedLessons.length
  const progressPct = totalReleasedLessons > 0 
    ? Math.round((completedLessons / totalReleasedLessons) * 100) 
    : 0

  return {
    completedLessons,
    totalReleasedLessons,
    progressPct,
    nextRelease: await getNextRelease(cohortId, now),
  }
}

/**
 * Get the next lesson release for a cohort
 */
async function getNextRelease(cohortId: string, after: Date) {
  const nextRelease = await prisma.lessonRelease.findFirst({
    where: {
      cohortId,
      releaseAt: { gt: after },
    },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
        },
      },
    },
    orderBy: { releaseAt: 'asc' },
  })

  return nextRelease
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  
  if (diffMs <= 0) {
    return 'Available now'
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (diffDays > 0) {
    return `Opens in ${diffDays}d ${diffHours}h`
  } else if (diffHours > 0) {
    return `Opens in ${diffHours}h ${diffMinutes}m`
  } else {
    return `Opens in ${diffMinutes}m`
  }
}
