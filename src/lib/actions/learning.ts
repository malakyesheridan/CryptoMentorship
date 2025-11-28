'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-server'
import { broadcastUserProgress, broadcastTrackProgress, broadcastAchievement } from '@/lib/learning/sse'
import { revalidatePath, revalidateTag } from 'next/cache'

const CompleteLessonSchema = z.object({ 
  lessonId: z.string().min(1),
  timeSpentMs: z.number().optional().default(0)
})
const SubmitQuizSchema = z.object({
  lessonId: z.string().min(1),
  answers: z.record(z.string(), z.array(z.number())).optional()
})
const EnrollSchema = z.object({ trackId: z.string().min(1) })

const CreateTrackSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  summary: z.string().optional(),
  coverUrl: z.string().optional(),
  minTier: z.enum(['guest', 'member', 'editor', 'admin']).optional(),
  publishedAt: z.string().optional().transform(str => str ? new Date(str) : undefined),
})

const UpdateTrackSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  summary: z.string().optional(),
  coverUrl: z.string().optional(),
  minTier: z.enum(['guest', 'member', 'editor', 'admin']).optional(),
  publishedAt: z.string().optional().transform(str => str ? new Date(str) : undefined),
  order: z.number().optional(),
})

const CreateSectionSchema = z.object({
  trackId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  summary: z.string().optional(),
  order: z.number().optional(),
})

const UpdateSectionSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  order: z.number().optional(),
})

const CreateLessonSchema = z.object({
  trackId: z.string().min(1),
  sectionId: z.string().optional(),
  slug: z.string().min(1, "Slug is required"),
  title: z.string().min(1, "Title is required"),
  contentMDX: z.string().optional(), // Optional - can be empty for video-only lessons
  durationMin: z.number().optional(),
  videoUrl: z.string().optional(),
  publishedAt: z.string().optional().transform(str => str ? new Date(str) : undefined),
  order: z.number().optional(),
})

const UpdateLessonSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  contentMDX: z.string().optional(),
  durationMin: z.number().optional(),
  videoUrl: z.string().optional(),
  publishedAt: z.string().optional().transform(str => str ? new Date(str) : undefined),
  order: z.number().optional(),
})

export async function completeLesson(input: unknown) {
  const user = await requireUser()
  const { lessonId, timeSpentMs } = CompleteLessonSchema.parse(input)

  // Get lesson details for progress calculation
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      track: {
        select: { id: true, title: true }
      }
    }
  })

  if (!lesson) {
    throw new Error('Lesson not found')
  }

  // Update lesson progress
  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: { 
      userId: user.id, 
      lessonId, 
      completedAt: new Date(),
      timeSpentMs: 0
    },
    update: { 
      completedAt: new Date(),
      timeSpentMs: 0
    }
  })

  // Update track progress
  const trackProgress = await updateTrackProgress(user.id, lesson.track.id)

  // Broadcast real-time updates
  broadcastUserProgress(user.id, {
    type: 'lesson_completed',
    lessonId,
    trackId: lesson.track.id,
    completedAt: progress.completedAt?.toISOString(),
    timeSpentMs: progress.timeSpentMs
  })

  broadcastTrackProgress(lesson.track.id, {
    type: 'track_progress_update',
    trackId: lesson.track.id,
    progressPct: trackProgress.progressPct,
    completedLessons: trackProgress.completedLessons,
    totalLessons: trackProgress.totalLessons
  })

  // Check for achievements
  await checkAndBroadcastAchievements(user.id, lesson.track.id, trackProgress)

  return { 
    ok: true, 
    progress: {
      lessonId,
      trackId: lesson.track.id,
      completedAt: progress.completedAt,
      timeSpentMs: progress.timeSpentMs,
      trackProgressPct: trackProgress.progressPct
    }
  }
}

export async function submitQuiz(input: unknown) {
  const user = await requireUser()
  const { lessonId, answers } = SubmitQuizSchema.parse(input)

  await prisma.quizSubmission.create({
    data: { 
      userId: user.id, 
      lessonId, 
      answers: JSON.stringify(answers ?? {}),
      scorePct: 100,
      passed: true
    }
  })

  return { ok: true, passed: true, scorePct: 100 }
}

export async function enrollInTrack(input: unknown) {
  const user = await requireUser()
  const { trackId } = EnrollSchema.parse(input)

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_trackId: { userId: user.id, trackId } },
    create: { userId: user.id, trackId, startedAt: new Date() },
    update: {}
  })

  // Broadcast enrollment
  broadcastUserProgress(user.id, {
    type: 'track_enrolled',
    trackId,
    enrolledAt: enrollment.startedAt.toISOString()
  })

  return { ok: true }
}

export async function createTrack(input: unknown) {
  const user = await requireUser()
  
  // Check if user has admin or editor role
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Insufficient permissions to create tracks')
  }

  const data = CreateTrackSchema.parse(input)

  // Check if slug already exists
  const existingTrack = await prisma.track.findUnique({
    where: { slug: data.slug }
  })

  if (existingTrack) {
    throw new Error('A track with this slug already exists')
  }

  // Create the track
  const track = await prisma.track.create({
    data: {
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      coverUrl: data.coverUrl,
      minTier: data.minTier || 'member',
      publishedAt: data.publishedAt,
    }
  })

  return { 
    success: true, 
    track: {
      id: track.id,
      title: track.title,
      slug: track.slug
    }
  }
}

export async function updateTrack(trackId: string, input: unknown) {
  const user = await requireUser()
  
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Insufficient permissions to update tracks')
  }

  const data = UpdateTrackSchema.parse(input)

  // Check if track exists
  const existingTrack = await prisma.track.findUnique({
    where: { id: trackId }
  })

  if (!existingTrack) {
    throw new Error('Track not found')
  }

  // Check slug uniqueness if slug is being updated
  if (data.slug && data.slug !== existingTrack.slug) {
    const slugExists = await prisma.track.findUnique({
      where: { slug: data.slug }
    })

    if (slugExists) {
      throw new Error('A track with this slug already exists')
    }
  }

  const track = await prisma.track.update({
    where: { id: trackId },
    data: {
      ...data,
      publishedAt: data.publishedAt,
    }
  })

  // Immediately revalidate all learning-related caches
  revalidatePath('/learning')
  revalidatePath(`/learn/${track.slug}`)
  revalidatePath(`/learn/${existingTrack.slug}`) // Also revalidate old slug if changed
  revalidateTag('learning-resources')
  revalidateTag(`all-courses-*`) // Invalidate all user caches for courses
  revalidateTag(`user-enrollments-*`) // Invalidate all user enrollment caches

  return { 
    success: true, 
    track: {
      id: track.id,
      title: track.title,
      slug: track.slug
    }
  }
}

export async function deleteTrack(trackId: string) {
  const user = await requireUser()
  
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Insufficient permissions to delete tracks')
  }

  // Check if track exists
  const existingTrack = await prisma.track.findUnique({
    where: { id: trackId }
  })

  if (!existingTrack) {
    throw new Error('Track not found')
  }

  // Delete the track (cascade will handle related records)
  await prisma.track.delete({
    where: { id: trackId }
  })

  return { success: true }
}

export async function createSection(input: unknown) {
  const user = await requireUser()
  
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Insufficient permissions to create sections')
  }

  const data = CreateSectionSchema.parse(input)

  // Check if track exists
  const track = await prisma.track.findUnique({
    where: { id: data.trackId }
  })

  if (!track) {
    throw new Error('Track not found')
  }

  // Get max order if not provided
  let order = data.order
  if (order === undefined) {
    const maxOrder = await prisma.trackSection.findFirst({
      where: { trackId: data.trackId },
      orderBy: { order: 'desc' },
      select: { order: true }
    })
    order = (maxOrder?.order ?? -1) + 1
  }

  const section = await prisma.trackSection.create({
    data: {
      trackId: data.trackId,
      title: data.title,
      summary: data.summary,
      order: order,
    }
  })

  return { 
    success: true, 
    section: {
      id: section.id,
      title: section.title,
      order: section.order
    }
  }
}

export async function updateSection(sectionId: string, input: unknown) {
  const user = await requireUser()
  
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Insufficient permissions to update sections')
  }

  const data = UpdateSectionSchema.parse(input)

  const section = await prisma.trackSection.update({
    where: { id: sectionId },
    data
  })

  return { 
    success: true, 
    section: {
      id: section.id,
      title: section.title,
      order: section.order
    }
  }
}

export async function deleteSection(sectionId: string) {
  const user = await requireUser()
  
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Insufficient permissions to delete sections')
  }

  await prisma.trackSection.delete({
    where: { id: sectionId }
  })

  return { success: true }
}

export async function createLesson(input: unknown) {
  const user = await requireUser()
  
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Insufficient permissions to create lessons')
  }

  const data = CreateLessonSchema.parse(input)

  // Check if track exists
  const track = await prisma.track.findUnique({
    where: { id: data.trackId }
  })

  if (!track) {
    throw new Error('Track not found')
  }

  // Check if section exists (if provided)
  if (data.sectionId) {
    const section = await prisma.trackSection.findUnique({
      where: { id: data.sectionId }
    })

    if (!section || section.trackId !== data.trackId) {
      throw new Error('Section not found or does not belong to this track')
    }
  }

  // Check slug uniqueness within track
  const existingLesson = await prisma.lesson.findUnique({
    where: { 
      trackId_slug: {
        trackId: data.trackId,
        slug: data.slug
      }
    }
  })

  if (existingLesson) {
    throw new Error('A lesson with this slug already exists in this track')
  }

  // Get max order if not provided
  let order = data.order
  if (order === undefined) {
    const maxOrder = await prisma.lesson.findFirst({
      where: { 
        trackId: data.trackId,
        sectionId: data.sectionId || null
      },
      orderBy: { order: 'desc' },
      select: { order: true }
    })
    order = (maxOrder?.order ?? -1) + 1
  }

  const lesson = await prisma.lesson.create({
    data: {
      trackId: data.trackId,
      sectionId: data.sectionId || null,
      slug: data.slug,
      title: data.title,
      contentMDX: data.contentMDX,
      durationMin: data.durationMin,
      videoUrl: data.videoUrl,
      publishedAt: data.publishedAt,
      order: order,
    }
  })

  return { 
    success: true, 
    lesson: {
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug
    }
  }
}

export async function updateLesson(lessonId: string, input: unknown) {
  const user = await requireUser()
  
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Insufficient permissions to update lessons')
  }

  const data = UpdateLessonSchema.parse(input)

  // Check if lesson exists
  const existingLesson = await prisma.lesson.findUnique({
    where: { id: lessonId }
  })

  if (!existingLesson) {
    throw new Error('Lesson not found')
  }

  // Check slug uniqueness if slug is being updated
  if (data.slug && data.slug !== existingLesson.slug) {
    const slugExists = await prisma.lesson.findUnique({
      where: { 
        trackId_slug: {
          trackId: existingLesson.trackId,
          slug: data.slug
        }
      }
    })

    if (slugExists) {
      throw new Error('A lesson with this slug already exists in this track')
    }
  }

  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...data,
      publishedAt: data.publishedAt,
    }
  })

  return { 
    success: true, 
    lesson: {
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug
    }
  }
}

export async function deleteLesson(lessonId: string) {
  const user = await requireUser()
  
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Insufficient permissions to delete lessons')
  }

  await prisma.lesson.delete({
    where: { id: lessonId }
  })

  return { success: true }
}

export async function reorderSections(trackId: string, sectionOrders: Array<{ id: string, order: number }>) {
  const user = await requireUser()
  
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Insufficient permissions to reorder sections')
  }

  await prisma.$transaction(
    sectionOrders.map(({ id, order }) =>
      prisma.trackSection.update({
        where: { id },
        data: { order }
      })
    )
  )

  return { success: true }
}

export async function reorderLessons(lessons: Array<{ id: string, order: number, sectionId?: string | null }>) {
  const user = await requireUser()
  
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Insufficient permissions to reorder lessons')
  }

  await prisma.$transaction(
    lessons.map(({ id, order, sectionId }) =>
      prisma.lesson.update({
        where: { id },
        data: { order, sectionId: sectionId || null }
      })
    )
  )

  return { success: true }
}

// Helper function to update track progress
async function updateTrackProgress(userId: string, trackId: string) {
  // Get total published lessons in track
  const totalLessons = await prisma.lesson.count({
    where: {
      trackId,
      publishedAt: { not: null },
    },
  })

  // Get completed published lessons for this user
  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      lesson: {
        trackId,
        publishedAt: { not: null },
      },
      completedAt: { not: null },
    },
  })

  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  // Update or create enrollment (upsert to handle case where enrollment doesn't exist)
  const enrollment = await prisma.enrollment.upsert({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
    create: {
      userId,
      trackId,
      progressPct,
      startedAt: new Date(),
      completedAt: progressPct === 100 ? new Date() : null,
    },
    update: {
      progressPct,
      completedAt: progressPct === 100 ? new Date() : null,
    },
  })

  // Track completion is tracked but no certificate is issued

  return {
    progressPct,
    completedLessons,
    totalLessons,
    completedAt: enrollment.completedAt
  }
}

// Helper function to issue certificate
async function issueCertificate(userId: string, trackId: string) {
  try {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { title: true }
    })

    if (!track) return

    const certificate = await prisma.certificate.create({
      data: {
        userId,
        trackId,
        code: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        meta: JSON.stringify({
          trackTitle: track.title,
          issuedAt: new Date().toISOString()
        })
      }
    })

    // Broadcast certificate achievement
    broadcastAchievement(userId, {
      type: 'certificate_earned',
      title: 'Certificate Earned!',
      description: `Congratulations! You've completed ${track.title}`,
      icon: 'award',
      certificateId: certificate.id,
      trackId
    })

    return certificate
  } catch (error) {
    console.error('Error issuing certificate:', error)
  }
}

// Helper function to check and broadcast achievements
async function checkAndBroadcastAchievements(userId: string, trackId: string, trackProgress: any) {
  // Check for track completion
  if (trackProgress.progressPct === 100) {
    broadcastAchievement(userId, {
      type: 'track_completed',
      title: 'Track Completed!',
      description: 'Amazing work! You\'ve completed this learning track.',
      icon: 'trophy',
      trackId
    })
  }

  // Check for streak milestones
  const streak = await calculateLearningStreak(userId)
  if (streak > 0 && streak % 7 === 0) {
    broadcastAchievement(userId, {
      type: 'streak_milestone',
      title: `${streak} Day Streak!`,
      description: `You've been learning for ${streak} consecutive days!`,
      icon: 'flame',
      streak
    })
  }
}

// Helper function to calculate learning streak
async function calculateLearningStreak(userId: string) {
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
