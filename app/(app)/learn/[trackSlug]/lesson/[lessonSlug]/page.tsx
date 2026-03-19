import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { LessonPlayer } from '@/components/learning/LessonPlayer'
import { ViewTracker } from '@/components/ViewTracker'
import { normalizePdfResources } from '@/lib/learning/resources'
import { unstable_cache } from 'next/cache'

export const revalidate = 300

async function getTrackAndLesson(trackSlug: string, lessonSlug: string) {
  const getCached = unstable_cache(
    async () => {
      const { prisma } = await import('@/lib/prisma')
      const [track, lesson] = await Promise.all([
        prisma.track.findUnique({
          where: { slug: trackSlug },
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
        }),
        prisma.lesson.findFirst({
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
        }),
      ])
      return { track, lesson }
    },
    [`track-lesson-${trackSlug}-${lessonSlug}`],
    { revalidate: 300, tags: [`track-${trackSlug}`, `lesson-${lessonSlug}`] }
  )
  return getCached()
}

async function getUserLessonData(userId: string, lessonId: string, trackId: string) {
  const [progress, quizSubmission, progresses] = await Promise.all([
    prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
    }),
    prisma.quizSubmission.findFirst({
      where: { userId, lessonId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: { trackId },
      },
      select: {
        lessonId: true,
        completedAt: true,
      },
    }),
  ])

  const userProgress: Record<string, boolean> = {}
  progresses.forEach(p => {
    userProgress[p.lessonId] = !!p.completedAt
  })

  return { progress, quizSubmission, userProgress }
}

export default async function LessonPage({
  params
}: {
  params: { trackSlug: string; lessonSlug: string }
}) {
  const user = await requireAuth()

  // Single cached fetch for track + lesson (content rarely changes)
  const { track, lesson } = await getTrackAndLesson(params.trackSlug, params.lessonSlug)

  if (!track || !lesson || !lesson.publishedAt) {
    redirect('/learning')
  }

  // All user-specific queries in one parallel batch
  // Enrollment upsert runs in parallel too — it's a no-op if already enrolled
  const [userData] = await Promise.all([
    getUserLessonData(user.id, lesson.id, track.id),
    prisma.enrollment.upsert({
      where: {
        userId_trackId: { userId: user.id, trackId: track.id },
      },
      create: {
        userId: user.id,
        trackId: track.id,
        startedAt: new Date(),
      },
      update: {},
    }),
  ])

  const { progress, quizSubmission, userProgress } = userData

  return (
    <>
      <ViewTracker
        entityType="lesson"
        entityId={lesson.id}
        disabled={!user.id}
      />
      <LessonPlayer
        track={track}
        lesson={{
          ...lesson,
          durationMin: lesson.durationMin ?? undefined,
          videoUrl: lesson.videoUrl ?? undefined,
          coverUrl: lesson.coverUrl ?? undefined,
          contentMDX: lesson.contentMDX ?? undefined,
          pdfResources: normalizePdfResources(lesson.pdfResources),
          quiz: lesson.quiz ?? undefined,
          section: lesson.section ?? undefined
        }}
        progress={progress ? { completedAt: progress.completedAt ?? undefined } : null}
        quizSubmission={quizSubmission}
        userProgress={userProgress}
        accessInfo={{ canAccess: true, isLocked: false }}
      />
    </>
  )
}
