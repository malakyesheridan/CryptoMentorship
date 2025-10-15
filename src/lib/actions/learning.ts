'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-server'
import { broadcastUserProgress, broadcastTrackProgress, broadcastAchievement } from '@/lib/learning/sse'

const CompleteLessonSchema = z.object({ 
  lessonId: z.string().min(1),
  timeSpentMs: z.number().optional()
})
const SubmitQuizSchema = z.object({
  lessonId: z.string().min(1),
  answers: z.record(z.string(), z.array(z.number())).optional()
})
const EnrollSchema = z.object({ trackId: z.string().min(1) })

const CreateTrackSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  publishedAt: z.date().optional(),
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
      timeSpentMs: timeSpentMs || 0
    },
    update: { 
      completedAt: new Date(),
      timeSpentMs: timeSpentMs || 0
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
      description: data.description,
      coverUrl: data.coverUrl,
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

  // Update enrollment
  const enrollment = await prisma.enrollment.update({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
    data: {
      progressPct,
      completedAt: progressPct === 100 ? new Date() : null,
    },
  })

  // If track is completed, issue certificate
  if (progressPct === 100 && !enrollment.completedAt) {
    await issueCertificate(userId, trackId)
  }

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
