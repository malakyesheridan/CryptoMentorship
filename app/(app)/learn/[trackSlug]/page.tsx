import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/access'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  FileText,
  Clock,
  BookOpen,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { normalizePdfResources } from '@/lib/learning/resources'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

export const revalidate = 300

async function getTrack(slug: string) {
  const getCached = unstable_cache(
    async () => {
      const { prisma } = await import('@/lib/prisma')
      return await prisma.track.findUnique({
        where: { slug },
        include: {
          sections: {
            include: {
              lessons: {
                where: { publishedAt: { not: null } },
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  durationMin: true,
                  quiz: { select: { id: true } },
                },
              },
            },
            orderBy: { order: 'asc' },
          },
          lessons: {
            where: { publishedAt: { not: null } },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              slug: true,
              title: true,
              durationMin: true,
              quiz: { select: { id: true } },
            },
          },
        },
      })
    },
    [`track-detail-${slug}`],
    { revalidate: 300, tags: [`track-${slug}`] }
  )
  return getCached()
}

async function getUserEnrollment(userId: string, trackId: string) {
  return await prisma.enrollment.findUnique({
    where: {
      userId_trackId: { userId, trackId },
    },
  })
}

async function getUserProgress(userId: string, trackId: string) {
  const progress = await prisma.lessonProgress.findMany({
    where: {
      userId,
      lesson: {
        trackId,
        publishedAt: { not: null },
      },
    },
    select: {
      lessonId: true,
      completedAt: true,
    },
  })

  return progress.reduce((acc, p) => {
    acc[p.lessonId] = !!p.completedAt
    return acc
  }, {} as Record<string, boolean>)
}

export default async function TrackPage({
  params
}: {
  params: { trackSlug: string }
}) {
  // Parallelize auth + track fetch (track doesn't need user ID)
  const [user, track] = await Promise.all([
    requireAuth(),
    getTrack(params.trackSlug),
  ])

  if (!track || !track.publishedAt) {
    redirect('/learning')
  }

  const [enrollment, userProgress] = await Promise.all([
    getUserEnrollment(user.id, track.id),
    getUserProgress(user.id, track.id),
  ])

  const totalLessons = track.lessons.length
  const completedLessons = Object.values(userProgress).filter(Boolean).length
  const totalDuration = track.lessons.reduce((sum, lesson) => sum + (lesson.durationMin || 0), 0)
  const progressPct = enrollment ? enrollment.progressPct : 0

  const lessonIdsInSections = new Set(
    track.sections.flatMap((section) => section.lessons.map((lesson) => lesson.id))
  )
  const lessonsWithoutSections = track.lessons.filter(
    (lesson) => !lessonIdsInSections.has(lesson.id)
  )

  const firstSectionLesson = track.sections.find((s) => s.lessons.length > 0)?.lessons[0] || null
  const firstStandaloneLesson = lessonsWithoutSections[0] || null
  const firstLesson = firstSectionLesson || firstStandaloneLesson || track.lessons[0] || null
  const nextLesson = track.lessons.find(lesson => !userProgress[lesson.id])

  const trackPdfResources = normalizePdfResources(track.pdfResources)

  // Build ordered lesson list for sidebar
  const sectionedLessons = track.sections.map(section => ({
    sectionId: section.id,
    sectionTitle: section.title,
    sectionSummary: section.summary,
    lessons: section.lessons,
  }))

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Back Button */}
        <div className="mb-4">
          <Link href="/learning">
            <Button variant="ghost" size="sm" className="text-[var(--text-muted)] hover:text-[var(--text-strong)]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Learning Hub
            </Button>
          </Link>
        </div>

        {/* Two-Pane Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-6 space-y-4">
              {/* Track Info Card */}
              <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                {/* Cover Image */}
                {track.coverUrl && (
                  <div className="aspect-video relative">
                    <Image
                      src={track.coverUrl}
                      alt={track.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <h1 className="text-xl font-bold text-[var(--text-strong)] leading-snug">{track.title}</h1>
                  {track.summary && (
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">{track.summary}</p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>{totalLessons} lessons</span>
                    </div>
                    {totalDuration > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {totalDuration >= 60
                            ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
                            : `${totalDuration}m`
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {enrollment && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[var(--text-muted)]">
                          {completedLessons} of {totalLessons} completed
                        </span>
                        <span className="font-medium text-[var(--text-strong)]">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-[#2a2520] rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            progressPct === 100 ? 'bg-[#4a7c3f]' : 'bg-gold-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* CTA Button */}
                  {enrollment ? (
                    nextLesson ? (
                      <Link href={`/learn/${track.slug}/lesson/${nextLesson.slug}`} className="block">
                        <Button className="w-full bg-gold-500 hover:bg-gold-600 text-white" size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Continue Learning
                        </Button>
                      </Link>
                    ) : firstLesson ? (
                      <Link href={`/learn/${track.slug}/lesson/${firstLesson.slug}`} className="block">
                        <Button className="w-full" variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Watch Again
                        </Button>
                      </Link>
                    ) : null
                  ) : firstLesson ? (
                    <Link href={`/learn/${track.slug}/lesson/${firstLesson.slug}`} className="block">
                      <Button className="w-full bg-gold-500 hover:bg-gold-600 text-white" size="sm">
                        <Play className="h-4 w-4 mr-2" />
                        Start Track
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>

              {/* PDFs */}
              {trackPdfResources.length > 0 && (
                <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                    <h3 className="text-sm font-semibold text-[var(--text-strong)]">Track PDFs</h3>
                  </div>
                  <div className="space-y-2">
                    {trackPdfResources.map((resource) => (
                      <a
                        key={resource.url}
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between text-sm text-[var(--text-muted)] hover:text-yellow-500 transition-colors"
                      >
                        <span className="truncate">{resource.title}</span>
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content — Lesson List */}
          <main className="flex-1 min-w-0">
            <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
              <div className="p-5 border-b border-[var(--border-subtle)]">
                <h2 className="text-lg font-bold text-[var(--text-strong)]">Lessons</h2>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  {completedLessons > 0
                    ? `${completedLessons} of ${totalLessons} completed`
                    : 'Select a lesson to start learning'
                  }
                </p>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {/* Sectioned lessons */}
                {sectionedLessons.map((section) => (
                  <div key={section.sectionId}>
                    <div className="px-5 py-3 bg-[#1a1815]">
                      <h3 className="text-sm font-semibold text-[var(--text-strong)] uppercase tracking-wide">
                        {section.sectionTitle}
                      </h3>
                      {section.sectionSummary && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{section.sectionSummary}</p>
                      )}
                    </div>
                    {section.lessons.map((lesson) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        trackSlug={track.slug}
                        isCompleted={!!userProgress[lesson.id]}
                        isNext={nextLesson?.id === lesson.id}
                      />
                    ))}
                  </div>
                ))}

                {/* Standalone lessons */}
                {lessonsWithoutSections.length > 0 && (
                  <div>
                    {track.sections.length > 0 && (
                      <div className="px-5 py-3 bg-[#1a1815]">
                        <h3 className="text-sm font-semibold text-[var(--text-strong)] uppercase tracking-wide">
                          Other Lessons
                        </h3>
                      </div>
                    )}
                    {lessonsWithoutSections.map((lesson) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        trackSlug={track.slug}
                        isCompleted={!!userProgress[lesson.id]}
                        isNext={nextLesson?.id === lesson.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function LessonRow({
  lesson,
  trackSlug,
  isCompleted,
  isNext,
}: {
  lesson: { id: string; slug: string; title: string; durationMin: number | null; quiz: { id: string } | null }
  trackSlug: string
  isCompleted: boolean
  isNext: boolean
}) {
  const hasQuiz = !!lesson.quiz
  return (
    <Link
      href={`/learn/${trackSlug}/lesson/${lesson.slug}`}
      className={`block px-5 py-3.5 hover:bg-[#1a1815] transition-colors ${
        isNext ? 'bg-[#1a1815]/50 border-l-2 border-l-gold-500' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
          isCompleted
            ? 'bg-[#1a2e1a] text-[#4a7c3f]'
            : isNext
              ? 'bg-gold-500/20 text-gold-500'
              : 'bg-[#1a1815] text-[var(--text-muted)]'
        }`}>
          {isCompleted ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-medium truncate ${
              isCompleted ? 'text-[var(--text-muted)]' : 'text-[var(--text-strong)]'
            }`}>
              {lesson.title}
            </h4>
            {hasQuiz && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                Quiz
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {lesson.durationMin && (
              <span className="text-xs text-[var(--text-muted)]">{lesson.durationMin} min</span>
            )}
            {isCompleted && (
              <span className="text-xs text-[#4a7c3f]">Completed</span>
            )}
          </div>
        </div>

        <ArrowRight className={`h-4 w-4 shrink-0 ${
          isNext ? 'text-gold-500' : 'text-[var(--text-muted)]'
        }`} />
      </div>
    </Link>
  )
}
