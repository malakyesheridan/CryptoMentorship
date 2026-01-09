'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { validateQuizQuestions, validateQuizAnswers, serializeQuizAnswers, type QuizAnswer } from '@/lib/schemas/learning'
import { logAudit } from '@/lib/audit'

// Enrollment schemas
const EnrollTrackSchema = z.object({
  trackId: z.string().min(1, 'Track ID is required'),
})

const CompleteLessonSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  timeSpentMs: z.number().int().min(0).default(0),
})

const SubmitQuizSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  answers: z.array(z.object({
    qId: z.string().min(1, 'Question ID is required'),
    selectedIndexes: z.array(z.number().int().min(0)),
  })),
})

// Enrollment actions
export async function enrollInTrack(data: z.infer<typeof EnrollTrackSchema>) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const validatedData = EnrollTrackSchema.parse(data)

  try {
    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_trackId: {
          userId: session.user.id,
          trackId: validatedData.trackId,
        },
      },
    })

    if (existingEnrollment) {
      return { success: true, enrollment: existingEnrollment }
    }

    // Check track exists and user has access
    const track = await prisma.track.findUnique({
      where: { id: validatedData.trackId },
      select: { slug: true, publishedAt: true },
    })

    if (!track || !track.publishedAt) {
      throw new Error('Track not found or not published')
    }

    // Wrap in transaction for atomicity
    const { enrollment, notification } = await prisma.$transaction(async (tx) => {
      const created = await tx.enrollment.create({
        data: {
          userId: session.user.id,
          trackId: validatedData.trackId,
        },
      })

      // Create notification within transaction
      const notif = await tx.notification.create({
        data: {
          userId: session.user.id,
          type: 'announcement',
          title: 'Learning Started',
          body: `You've started the track. Begin your learning journey!`,
          url: `/learn/${track.slug}`,
          channel: 'inapp',
        },
      })

      // Audit log within transaction
      await logAudit(
        tx,
        session.user.id,
        'enroll',
        'enrollment',
        created.id,
        { trackId: validatedData.trackId, trackSlug: track.slug }
      )

      return { enrollment: created, notification: notif }
    })

    revalidatePath('/learn')
    revalidatePath('/learning')
    revalidatePath(`/learn/${track.slug}`)
    
    return { success: true, enrollment }
  } catch (error) {
    console.error('Error enrolling in track:', error)
    throw new Error('Failed to enroll in track')
  }
}

export async function completeLesson(data: z.infer<typeof CompleteLessonSchema>) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const validatedData = CompleteLessonSchema.parse(data)

  try {
    // Check if lesson has quiz
    const lesson = await prisma.lesson.findUnique({
      where: { id: validatedData.lessonId },
      select: { 
        id: true, 
        slug: true,
        trackId: true, 
        quizId: true,
        track: { select: { slug: true } }
      },
    })

    if (!lesson) {
      throw new Error('Lesson not found')
    }

    // If lesson has quiz, check if user passed it
    if (lesson.quizId) {
      const latestSubmission = await prisma.quizSubmission.findFirst({
        where: {
          userId: session.user.id,
          lessonId: validatedData.lessonId,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!latestSubmission || !latestSubmission.passed) {
        throw new Error('Must pass quiz to complete lesson')
      }
    }

    // Create or update lesson progress
    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId: validatedData.lessonId,
        },
      },
      update: {
        completedAt: new Date(),
        timeSpentMs: validatedData.timeSpentMs,
      },
      create: {
        userId: session.user.id,
        lessonId: validatedData.lessonId,
        completedAt: new Date(),
        timeSpentMs: validatedData.timeSpentMs,
      },
    })

    // Update track progress
    await updateTrackProgress(session.user.id, lesson.trackId)

    revalidatePath('/learn')
    revalidatePath('/learning')
    revalidatePath(`/learn/${lesson.track.slug}`)
    revalidatePath(`/learn/${lesson.track.slug}/lesson/${lesson.slug}`)
    
    return { success: true, progress }
  } catch (error) {
    console.error('Error completing lesson:', error)
    throw new Error('Failed to complete lesson')
  }
}

export async function submitQuiz(data: z.infer<typeof SubmitQuizSchema>) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const validatedData = SubmitQuizSchema.parse(data)

  try {
    // Rate limiting: Check recent submissions
    const recentSubmissions = await prisma.quizSubmission.count({
      where: {
        userId: session.user.id,
        lessonId: validatedData.lessonId,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // Last minute
        },
      },
    })

    if (recentSubmissions >= 5) {
      throw new Error('Too many quiz submissions. Please wait before trying again.')
    }

    // Get lesson and quiz
    const lesson = await prisma.lesson.findUnique({
      where: { id: validatedData.lessonId },
      include: {
        quiz: true,
        track: { select: { slug: true } },
      },
    })

    if (!lesson || !lesson.quiz) {
      throw new Error('Lesson or quiz not found')
    }

    // Parse and validate quiz questions
    const questions = validateQuizQuestions(lesson.quiz.questions)

    // Calculate score
    let correctAnswers = 0
    let totalQuestions = questions.length

    for (const question of questions) {
      const userAnswer = validatedData.answers.find(a => a.qId === question.id)
      if (userAnswer) {
        const userIndexes = userAnswer.selectedIndexes || []
        const correctIndexes = question.correctIndexes || []
        
        // Check if arrays are equal (order doesn't matter for multiple choice)
        const userSorted = [...userIndexes].sort()
        const correctSorted = [...correctIndexes].sort()
        
        if (userSorted.length === correctSorted.length &&
            userSorted.every((val, idx) => val === correctSorted[idx])) {
          correctAnswers++
        }
      }
    }

    const scorePct = Math.round((correctAnswers / totalQuestions) * 100)
    const passed = scorePct >= lesson.quiz.passPct

    // Serialize answers for storage
    const answersJson = serializeQuizAnswers(validatedData.answers)

    // Wrap in transaction for atomicity
    const submission = await prisma.$transaction(async (tx) => {
      // Create quiz submission
      const created = await tx.quizSubmission.create({
        data: {
          userId: session.user.id,
          lessonId: validatedData.lessonId,
          scorePct,
          passed,
          answers: answersJson,
        },
      })

      // Audit log within transaction
      await logAudit(
        tx,
        session.user.id,
        'submit',
        'quiz',
        created.id,
        { 
          lessonId: validatedData.lessonId, 
          scorePct, 
          passed,
          correctAnswers,
          totalQuestions 
        }
      )

      return created
    })

    revalidatePath(`/learn/${lesson.track.slug}/lesson/${lesson.slug}`)
    
    return { 
      success: true, 
      submission: {
        ...submission,
        correctAnswers,
        totalQuestions,
      }
    }
  } catch (error) {
    console.error('Error submitting quiz:', error)
    throw new Error('Failed to submit quiz')
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

  return enrollment
}

// Helper function to issue certificate
async function issueCertificate(userId: string, trackId: string) {
  try {
    // Get track info
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { slug: true },
    })

    if (!track) {
      throw new Error('Track not found')
    }

    // Check if certificate already exists (idempotent)
    const existingCertificate = await prisma.certificate.findUnique({
      where: {
        userId_trackId: {
          userId,
          trackId,
        },
      },
    })

    if (existingCertificate) {
      return existingCertificate
    }

    // Generate unique code
    let code: string
    let attempts = 0
    const maxAttempts = 10

    do {
      code = `TRACK-${nanoid(8).toUpperCase()}`
      const existing = await prisma.certificate.findUnique({
        where: { code },
      })
      if (!existing) break
      attempts++
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique certificate code')
    }

    // Create certificate
    const certificate = await prisma.certificate.create({
      data: {
        userId,
        trackId,
        code,
        meta: JSON.stringify({
          issuedAt: new Date().toISOString(),
        }),
      },
    })

    // Create notification (idempotent)
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'announcement',
        title: 'Track Completed!',
      },
    })

    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'announcement',
          title: 'Track Completed!',
          body: `Congratulations! You've completed the track and earned a certificate.`,
          url: `/learn/${track.slug}/certificate`,
          channel: 'inapp',
        },
      })
    }

    return certificate
  } catch (error) {
    console.error('Error issuing certificate:', error)
    throw error
  }
}
