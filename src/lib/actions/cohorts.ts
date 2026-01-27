'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { resolveNotificationPreferences, shouldSendInAppNotification } from '@/lib/notification-preferences'

// Cohort schemas
const CreateCohortSchema = z.object({
  trackId: z.string().min(1, 'Track ID is required'),
  slug: z.string().min(1, 'Slug is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  timezone: z.string().default('Australia/Sydney'),
  visibility: z.enum(['member', 'admin']).default('member'),
})

const UpdateCohortSchema = CreateCohortSchema.partial().omit({ trackId: true })

const EnrollCohortSchema = z.object({
  cohortId: z.string().min(1, 'Cohort ID is required'),
  role: z.enum(['member', 'coach']).default('member'),
})

const CreateLessonReleaseSchema = z.object({
  cohortId: z.string().min(1, 'Cohort ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  releaseAt: z.string().datetime(),
})

const BulkCreateLessonReleasesSchema = z.object({
  cohortId: z.string().min(1, 'Cohort ID is required'),
  lessonIds: z.array(z.string().min(1)),
  cadenceDays: z.number().int().min(1).default(7),
  startOffsetDays: z.number().int().min(0).default(0),
})

// Cohort actions
export async function createCohort(data: z.infer<typeof CreateCohortSchema>) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }

  const validatedData = CreateCohortSchema.parse(data)

  try {
    const cohort = await prisma.cohort.create({
      data: {
        ...validatedData,
        startsAt: new Date(validatedData.startsAt),
        endsAt: validatedData.endsAt ? new Date(validatedData.endsAt) : null,
      },
    })

    revalidatePath('/admin/learn/cohorts')
    revalidatePath(`/admin/learn/cohorts/${cohort.id}`)
    
    return { success: true, cohort }
  } catch (error) {
    console.error('Error creating cohort:', error)
    throw new Error('Failed to create cohort')
  }
}

export async function updateCohort(id: string, data: z.infer<typeof UpdateCohortSchema>) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }

  const validatedData = UpdateCohortSchema.parse(data)

  try {
    const cohort = await prisma.cohort.update({
      where: { id },
      data: {
        ...validatedData,
        startsAt: validatedData.startsAt ? new Date(validatedData.startsAt) : undefined,
        endsAt: validatedData.endsAt ? new Date(validatedData.endsAt) : undefined,
      },
    })

    revalidatePath('/admin/learn/cohorts')
    revalidatePath(`/admin/learn/cohorts/${id}`)
    
    return { success: true, cohort }
  } catch (error) {
    console.error('Error updating cohort:', error)
    throw new Error('Failed to update cohort')
  }
}

export async function deleteCohort(id: string) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }

  try {
    await prisma.cohort.delete({
      where: { id },
    })

    revalidatePath('/admin/learn/cohorts')
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting cohort:', error)
    throw new Error('Failed to delete cohort')
  }
}

// Enrollment actions
export async function enrollInCohort(data: z.infer<typeof EnrollCohortSchema>) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const validatedData = EnrollCohortSchema.parse(data)

  try {
    // Check if already enrolled
    const existingEnrollment = await prisma.cohortEnrollment.findUnique({
      where: {
        cohortId_userId: {
          cohortId: validatedData.cohortId,
          userId: session.user.id,
        },
      },
    })

    if (existingEnrollment) {
      return { success: true, enrollment: existingEnrollment }
    }

    // Check cohort exists and user has access
    const cohort = await prisma.cohort.findUnique({
      where: { id: validatedData.cohortId },
      include: {
        track: { select: { slug: true, publishedAt: true } },
      },
    })

    if (!cohort || !cohort.track.publishedAt) {
      throw new Error('Cohort not found or track not published')
    }

    const enrollment = await prisma.cohortEnrollment.create({
      data: {
        cohortId: validatedData.cohortId,
        userId: session.user.id,
        role: validatedData.role,
      },
    })

    // Create notification (respect preferences)
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id }
    })
    const shouldNotify = shouldSendInAppNotification('announcement', resolveNotificationPreferences(preferences ?? null))
    if (shouldNotify) {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: 'announcement',
          title: 'Cohort Joined',
          body: `You've joined the ${cohort.title} cohort.`,
          url: `/learn/cohorts/${cohort.slug}`,
          channel: 'inapp',
        },
      })
    }

    revalidatePath('/learning')
    revalidatePath(`/learn/${cohort.track.slug}/cohort/${cohort.slug}`)
    
    return { success: true, enrollment }
  } catch (error) {
    console.error('Error enrolling in cohort:', error)
    throw new Error('Failed to enroll in cohort')
  }
}

export async function leaveCohort(cohortId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  try {
    const enrollment = await prisma.cohortEnrollment.findUnique({
      where: {
        cohortId_userId: {
          cohortId,
          userId: session.user.id,
        },
      },
      include: {
        cohort: { select: { slug: true, track: { select: { slug: true } } } },
      },
    })

    if (!enrollment) {
      throw new Error('Not enrolled in this cohort')
    }

    await prisma.cohortEnrollment.delete({
      where: {
        cohortId_userId: {
          cohortId,
          userId: session.user.id,
        },
      },
    })

    revalidatePath('/learning')
    revalidatePath(`/learn/${enrollment.cohort.track.slug}/cohort/${enrollment.cohort.slug}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error leaving cohort:', error)
    throw new Error('Failed to leave cohort')
  }
}

// Lesson release actions
export async function createLessonRelease(data: z.infer<typeof CreateLessonReleaseSchema>) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }

  const validatedData = CreateLessonReleaseSchema.parse(data)

  try {
    // Validate lesson is published
    const lesson = await prisma.lesson.findUnique({
      where: { id: validatedData.lessonId },
      select: { publishedAt: true },
    })

    if (!lesson || !lesson.publishedAt) {
      throw new Error('Lesson must be published to schedule releases')
    }

    const release = await prisma.lessonRelease.create({
      data: {
        cohortId: validatedData.cohortId,
        lessonId: validatedData.lessonId,
        releaseAt: new Date(validatedData.releaseAt),
      },
    })

    revalidatePath(`/admin/learn/cohorts/${validatedData.cohortId}`)
    
    return { success: true, release }
  } catch (error) {
    console.error('Error creating lesson release:', error)
    throw new Error('Failed to create lesson release')
  }
}

export async function bulkCreateLessonReleases(data: z.infer<typeof BulkCreateLessonReleasesSchema>) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }

  const validatedData = BulkCreateLessonReleasesSchema.parse(data)

  try {
    // Get cohort start date
    const cohort = await prisma.cohort.findUnique({
      where: { id: validatedData.cohortId },
      select: { startsAt: true },
    })

    if (!cohort) {
      throw new Error('Cohort not found')
    }

    // Validate all lessons are published
    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: validatedData.lessonIds },
        publishedAt: { not: null },
      },
      select: { id: true },
    })

    if (lessons.length !== validatedData.lessonIds.length) {
      throw new Error('All lessons must be published to schedule releases')
    }

    // Create releases
    const releases = []
    const startDate = new Date(cohort.startsAt)
    startDate.setDate(startDate.getDate() + validatedData.startOffsetDays)

    for (let i = 0; i < validatedData.lessonIds.length; i++) {
      const releaseAt = new Date(startDate)
      releaseAt.setDate(releaseAt.getDate() + (i * validatedData.cadenceDays))

      const release = await prisma.lessonRelease.create({
        data: {
          cohortId: validatedData.cohortId,
          lessonId: validatedData.lessonIds[i],
          releaseAt,
        },
      })

      releases.push(release)
    }

    revalidatePath(`/admin/learn/cohorts/${validatedData.cohortId}`)
    
    return { success: true, releases }
  } catch (error) {
    console.error('Error creating bulk lesson releases:', error)
    throw new Error('Failed to create lesson releases')
  }
}

export async function deleteLessonRelease(id: string) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }

  try {
    const release = await prisma.lessonRelease.findUnique({
      where: { id },
      select: { cohortId: true },
    })

    await prisma.lessonRelease.delete({
      where: { id },
    })

    revalidatePath(`/admin/learn/cohorts/${release?.cohortId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting lesson release:', error)
    throw new Error('Failed to delete lesson release')
  }
}

// Admin enrollment management
export async function addUserToCohort(cohortId: string, userId: string, role: 'member' | 'coach' = 'member') {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }

  try {
    const enrollment = await prisma.cohortEnrollment.upsert({
      where: {
        cohortId_userId: {
          cohortId,
          userId,
        },
      },
      update: { role },
      create: {
        cohortId,
        userId,
        role,
      },
    })

    revalidatePath(`/admin/learn/cohorts/${cohortId}`)
    
    return { success: true, enrollment }
  } catch (error) {
    console.error('Error adding user to cohort:', error)
    throw new Error('Failed to add user to cohort')
  }
}

export async function removeUserFromCohort(cohortId: string, userId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }

  try {
    await prisma.cohortEnrollment.delete({
      where: {
        cohortId_userId: {
          cohortId,
          userId,
        },
      },
    })

    revalidatePath(`/admin/learn/cohorts/${cohortId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error removing user from cohort:', error)
    throw new Error('Failed to remove user from cohort')
  }
}
