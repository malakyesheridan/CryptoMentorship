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
  userId: string,
  lessonId: string,
  trackId: string
): Promise<LessonAccessInfo> {
  // First check if lesson is published
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

  // Check if user is enrolled in any cohorts for this track
  const cohortEnrollments = await prisma.cohortEnrollment.findMany({
    where: {
      userId,
      cohort: {
        trackId,
      },
    },
    include: {
      cohort: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  })

  // If no cohort enrollments, check if track has any cohorts
  const trackCohorts = await prisma.cohort.findMany({
    where: { trackId },
    select: { id: true },
  })

  // If track has cohorts but user isn't enrolled in any, lesson is locked
  if (trackCohorts.length > 0 && cohortEnrollments.length === 0) {
    return { canAccess: false, isLocked: true }
  }

  // If no cohorts exist for this track, it's self-paced (immediate access)
  if (trackCohorts.length === 0) {
    return { canAccess: true, isLocked: false }
  }

  // Check release schedule for enrolled cohorts
  const now = new Date()
  let earliestRelease: Date | null = null
  let accessibleCohortId: string | null = null

  for (const enrollment of cohortEnrollments) {
    const release = await prisma.lessonRelease.findUnique({
      where: {
        cohortId_lessonId: {
          cohortId: enrollment.cohort.id,
          lessonId,
        },
      },
      select: {
        releaseAt: true,
      },
    })

    if (release && release.releaseAt <= now) {
      // User can access this lesson
      return { 
        canAccess: true, 
        isLocked: false,
        cohortId: enrollment.cohort.id 
      }
    }

    if (release && (!earliestRelease || release.releaseAt < earliestRelease)) {
      earliestRelease = release.releaseAt
      accessibleCohortId = enrollment.cohort.id
    }
  }

  // If we have a release date but it's in the future
  if (earliestRelease) {
    return {
      canAccess: false,
      isLocked: true,
      releaseAt: earliestRelease,
      cohortId: accessibleCohortId || undefined,
    }
  }

  // No release schedule found for this lesson in any enrolled cohort
  return { canAccess: false, isLocked: true }
}

/**
 * Get all accessible lessons for a user in a track (considering cohort releases)
 */
export async function getAccessibleLessons(userId: string, trackId: string) {
  const now = new Date()

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

  // Check if track has cohorts
  const trackCohorts = await prisma.cohort.findMany({
    where: { trackId },
    select: { id: true },
  })

  // If no cohorts, all published lessons are accessible (self-paced)
  if (trackCohorts.length === 0) {
    return allLessons.map(lesson => ({
      ...lesson,
      canAccess: true,
      isLocked: false,
      releaseAt: null,
    }))
  }

  // Check cohort enrollments
  const cohortEnrollments = await prisma.cohortEnrollment.findMany({
    where: {
      userId,
      cohort: { trackId },
    },
    select: { cohortId: true },
  })

  // If no enrollments but track has cohorts, all lessons are locked
  if (cohortEnrollments.length === 0) {
    return allLessons.map(lesson => ({
      ...lesson,
      canAccess: false,
      isLocked: true,
      releaseAt: null,
    }))
  }

  const enrolledCohortIds = cohortEnrollments.map(e => e.cohortId)

  // Process each lesson
  return allLessons.map(lesson => {
    // Find releases for enrolled cohorts
    const relevantReleases = lesson.releases.filter(release =>
      enrolledCohortIds.includes(release.cohortId)
    )

    if (relevantReleases.length === 0) {
      return {
        ...lesson,
        canAccess: false,
        isLocked: true,
        releaseAt: null,
      }
    }

    // Find the earliest release that has passed
    const accessibleRelease = relevantReleases.find(release => release.releaseAt <= now)
    
    if (accessibleRelease) {
      return {
        ...lesson,
        canAccess: true,
        isLocked: false,
        releaseAt: accessibleRelease.releaseAt,
      }
    }

    // Find the next release
    const nextRelease = relevantReleases.reduce((earliest, release) => {
      if (!earliest || release.releaseAt < earliest.releaseAt) {
        return release
      }
      return earliest
    }, null as typeof relevantReleases[0] | null)

    return {
      ...lesson,
      canAccess: false,
      isLocked: true,
      releaseAt: nextRelease?.releaseAt || null,
    }
  })
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
