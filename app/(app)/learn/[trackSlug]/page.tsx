import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  CheckCircle,
  Lock,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { enrollInTrack } from '@/lib/actions/enrollment'

// Revalidate every 5 minutes - track content is published, not real-time
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
            include: {
              quiz: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      },
      lessons: {
        where: { publishedAt: { not: null } },
        orderBy: { order: 'asc' },
        include: {
          quiz: true,
        },
      },
      enrollments: {
        select: { id: true },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  })

  return track
}

async function getUserEnrollment(userId: string, trackId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
  })

  return enrollment
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
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  const track = await getTrack(params.trackSlug)
  
  if (!track || !track.publishedAt) {
    redirect('/learn')
  }

  const [enrollment, userProgress] = await Promise.all([
    getUserEnrollment(session.user.id, track.id),
    getUserProgress(session.user.id, track.id),
  ])

  const tierLevels = { guest: 0, member: 1, editor: 2, admin: 3 }
  const userTierLevel = tierLevels[session.user.role as keyof typeof tierLevels] || 0
  const hasAccess = userTierLevel >= tierLevels[track.minTier as keyof typeof tierLevels]

  // Calculate stats
  const totalLessons = track.lessons.length
  const completedLessons = Object.values(userProgress).filter(Boolean).length
  const totalDuration = track.lessons.reduce((sum, lesson) => sum + (lesson.durationMin || 0), 0)
  const progressPct = enrollment ? enrollment.progressPct : 0

  // Find next lesson
  const nextLesson = track.lessons.find(lesson => !userProgress[lesson.id])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/learning">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Learning Hub
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">{track.title}</h1>
              <p className="text-slate-600 mt-2">{track.summary}</p>
            </div>
          </div>

          {/* Track Cover */}
          {track.coverUrl && (
            <div className="aspect-video relative mb-8 rounded-lg overflow-hidden">
              <Image
                src={track.coverUrl}
                alt={track.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Simple Progress and Action */}
          {enrollment && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">
                  {completedLessons} of {totalLessons} lessons completed
                </span>
                <span className="text-sm font-medium text-slate-900">{progressPct}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-gold-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          {hasAccess && (
            <div className="mb-8">
              {enrollment ? (
                nextLesson ? (
                  <Link href={`/learn/${track.slug}/lesson/${nextLesson.slug}`}>
                    <Button size="lg">
                      <Play className="h-5 w-5 mr-2" />
                      Continue Learning
                    </Button>
                  </Link>
                ) : (
                  // Allow re-watching completed tracks - start from first lesson
                  <Link href={`/learn/${track.slug}/lesson/${track.lessons[0]?.slug}`}>
                    <Button size="lg" variant="outline">
                      <Play className="h-5 w-5 mr-2" />
                      Watch Again
                    </Button>
                  </Link>
                )
              ) : (
                <form action={async () => {
                  'use server'
                  await enrollInTrack({ trackId: track.id })
                }}>
                  <Button type="submit" size="lg">
                    <Play className="h-5 w-5 mr-2" />
                    Start Track
                  </Button>
                </form>
              )}
            </div>
          )}

          {!hasAccess && (
            <div className="mb-8">
              <Button disabled size="lg">
                <Lock className="h-5 w-5 mr-2" />
                Upgrade to {track.minTier} tier to access this track
              </Button>
            </div>
          )}
        </div>

        {/* Lessons List - Prominent and Easy to Navigate */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Lessons</h2>
            <p className="text-sm text-slate-600 mt-1">Select a lesson to watch</p>
          </div>
          
          <div className="divide-y divide-slate-200">
            {/* Lessons in sections */}
            {track.sections.map((section) => (
              <div key={section.id}>
                {section.title && (
                  <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">{section.title}</h3>
                    {section.summary && (
                      <p className="text-sm text-slate-600 mt-1">{section.summary}</p>
                    )}
                  </div>
                )}
                {section.lessons.map((lesson) => {
                  const isCompleted = userProgress[lesson.id]
                  const hasQuiz = !!lesson.quiz
                  
                  return (
                    <Link
                      key={lesson.id}
                      href={hasAccess ? `/learn/${track.slug}/lesson/${lesson.slug}` : '#'}
                      className={`block px-6 py-4 hover:bg-slate-50 transition-colors ${
                        !hasAccess ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          isCompleted 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-slate-900">{lesson.title}</h4>
                            {isCompleted && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Completed
                              </Badge>
                            )}
                            {hasQuiz && (
                              <Badge variant="secondary" className="text-xs">
                                Quiz
                              </Badge>
                            )}
                          </div>
                          {lesson.durationMin && (
                            <p className="text-sm text-slate-600 mt-1">
                              {lesson.durationMin} minutes
                            </p>
                          )}
                        </div>

                        {hasAccess && (
                          <Button variant="ghost" size="sm" className="flex-shrink-0">
                            {isCompleted ? 'Review' : 'Watch'}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ))}
            
            {/* Lessons without sections */}
            {(() => {
              // Get all lesson IDs that are in sections
              const lessonIdsInSections = new Set(
                track.sections.flatMap(section => section.lessons.map(lesson => lesson.id))
              )
              // Filter out lessons that are already in sections
              const lessonsWithoutSections = track.lessons.filter(
                lesson => !lessonIdsInSections.has(lesson.id)
              )
              
              if (lessonsWithoutSections.length === 0) return null
              
              return (
                <div>
                  {track.sections.length > 0 && (
                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">Other Lessons</h3>
                    </div>
                  )}
                  {lessonsWithoutSections.map((lesson) => {
                  const isCompleted = userProgress[lesson.id]
                  const hasQuiz = !!lesson.quiz
                  
                  return (
                    <Link
                      key={lesson.id}
                      href={hasAccess ? `/learn/${track.slug}/lesson/${lesson.slug}` : '#'}
                      className={`block px-6 py-4 hover:bg-slate-50 transition-colors ${
                        !hasAccess ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          isCompleted 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-slate-900">{lesson.title}</h4>
                            {isCompleted && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Completed
                              </Badge>
                            )}
                            {hasQuiz && (
                              <Badge variant="secondary" className="text-xs">
                                Quiz
                              </Badge>
                            )}
                          </div>
                          {lesson.durationMin && (
                            <p className="text-sm text-slate-600 mt-1">
                              {lesson.durationMin} minutes
                            </p>
                          )}
                        </div>

                        {hasAccess && (
                          <Button variant="ghost" size="sm" className="flex-shrink-0">
                            {isCompleted ? 'Review' : 'Watch'}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </Link>
                  )
                  })
                }
                </div>
              )
            })()}
          </div>
        </div>

        {/* Track Description */}
        {track.description && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>About This Track</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate max-w-none">
                {/* TODO: Render MDX content */}
                <p className="text-slate-600">{track.description}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
