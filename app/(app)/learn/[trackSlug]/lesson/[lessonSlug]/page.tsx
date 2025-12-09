import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { LessonPlayer } from '@/components/learning/LessonPlayer'
import { ViewTracker } from '@/components/ViewTracker'
import { checkLessonAccess } from '@/lib/cohorts'

// Revalidate every 5 minutes - lesson content is published, not real-time
export const revalidate = 300

async function getTrack(slug: string) {
  const track = await prisma.track.findUnique({
    where: { slug },
    include: {
      sections: {
        include: {
          lessons: {
            where: { publishedAt: { not: null } },
            orderBy: { order: 'asc' },
            select: { id: true, slug: true, title: true },
          },
        },
        orderBy: { order: 'asc' },
      },
      lessons: {
        where: { publishedAt: { not: null } },
        orderBy: { order: 'asc' },
        select: { id: true, slug: true, title: true },
      },
    },
  })

  return track
}

async function getLesson(trackSlug: string, lessonSlug: string) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      slug: lessonSlug,
      track: { slug: trackSlug },
      publishedAt: { not: null },
    },
    include: {
      track: {
        select: { id: true, slug: true, title: true },
      },
      section: {
        select: { id: true, title: true },
      },
      quiz: true,
    },
  })

  return lesson
}

async function getUserProgress(userId: string, lessonId: string) {
  const progress = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
  })

  return progress
}

async function getUserQuizSubmission(userId: string, lessonId: string) {
  const submission = await prisma.quizSubmission.findFirst({
    where: {
      userId,
      lessonId,
    },
    orderBy: { createdAt: 'desc' },
  })

  return submission
}

export default async function LessonPage({
  params
}: {
  params: { trackSlug: string; lessonSlug: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  const [track, lesson] = await Promise.all([
    getTrack(params.trackSlug),
    getLesson(params.trackSlug, params.lessonSlug),
  ])

  if (!track || !lesson) {
    redirect('/learn')
  }

  const [progress, quizSubmission] = await Promise.all([
    getUserProgress(session.user.id, lesson.id),
    getUserQuizSubmission(session.user.id, lesson.id),
  ])

  // Ensure user is enrolled in track (auto-enroll if not already enrolled)
  await prisma.enrollment.upsert({
    where: {
      userId_trackId: {
        userId: session.user.id,
        trackId: track.id,
      },
    },
    create: {
      userId: session.user.id,
      trackId: track.id,
      startedAt: new Date(),
    },
    update: {},
  })

  // Check lesson access
  const accessInfo = await checkLessonAccess(session.user.id, lesson.id, track.id)

  // Get user progress for all lessons
  const userProgress: Record<string, boolean> = {}
  const progresses = await prisma.lessonProgress.findMany({
    where: {
      userId: session.user.id,
      lesson: {
        trackId: track.id,
      },
    },
    select: {
      lessonId: true,
      completedAt: true,
    },
  })

  progresses.forEach(progress => {
    userProgress[progress.lessonId] = !!progress.completedAt
  })

  return (
    <>
      <ViewTracker
        entityType="lesson"
        entityId={lesson.id}
        disabled={!session.user?.id}
      />
      <LessonPlayer
        track={track}
        lesson={{ 
          ...lesson, 
          durationMin: lesson.durationMin ?? undefined,
          videoUrl: lesson.videoUrl ?? undefined,
          contentMDX: lesson.contentMDX ?? undefined,
          quiz: lesson.quiz ?? undefined,
          section: lesson.section ?? undefined
        }}
        progress={progress ? { completedAt: progress.completedAt ?? undefined } : null}
        quizSubmission={quizSubmission}
        userProgress={userProgress}
        accessInfo={accessInfo}
      />
    </>
  )
}
