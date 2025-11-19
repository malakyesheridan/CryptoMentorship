import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Clock, 
  Users, 
  Play, 
  CheckCircle,
  Lock,
  ArrowLeft,
  Calendar,
  Target,
  Award
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
            <Link href="/learn">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Learning
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

          {/* Track Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Lessons</p>
                  <p className="text-2xl font-bold text-slate-900">{totalLessons}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Duration</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {Math.round(totalDuration / 60)}h {totalDuration % 60}m
                  </p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Students</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {track._count.enrollments}
                  </p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Progress</p>
                  <p className="text-2xl font-bold text-gold-600">{progressPct}%</p>
                </div>
                <div className="h-8 w-8 bg-gold-100 rounded-lg flex items-center justify-center">
                  <Target className="h-4 w-4 text-gold-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {enrollment && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Your Progress</h3>
                <span className="text-sm text-slate-600">
                  {completedLessons} of {totalLessons} lessons completed
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div 
                  className="bg-gold-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mb-8">
            {!hasAccess ? (
              <Button disabled size="lg">
                <Lock className="h-5 w-5 mr-2" />
                Upgrade to {track.minTier} tier to access this track
              </Button>
            ) : enrollment ? (
              <div className="flex items-center gap-4">
                {nextLesson ? (
                  <Link href={`/learn/${track.slug}/lesson/${nextLesson.slug}`}>
                    <Button size="lg">
                      <Play className="h-5 w-5 mr-2" />
                      Continue Learning
                    </Button>
                  </Link>
                ) : (
                  <Button disabled size="lg">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Track Completed!
                  </Button>
                )}
                
                {progressPct === 100 && (
                  <Link href={`/learn/cert/${enrollment.id}`}>
                    <Button variant="outline" size="lg">
                      <Award className="h-5 w-5 mr-2" />
                      View Certificate
                    </Button>
                  </Link>
                )}
              </div>
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
        </div>

        {/* Sections and Lessons */}
        <div className="space-y-6">
          {track.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-gold-600" />
                  {section.title}
                </CardTitle>
                {section.summary && (
                  <CardDescription>{section.summary}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.lessons.map((lesson) => {
                    const isCompleted = userProgress[lesson.id]
                    const hasQuiz = !!lesson.quiz
                    
                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isCompleted 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            isCompleted 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-slate-900">{lesson.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              {lesson.durationMin && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {lesson.durationMin}m
                                </span>
                              )}
                              {hasQuiz && (
                                <Badge variant="secondary" className="text-xs">
                                  Quiz
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {hasAccess && (
                          <Link href={`/learn/${track.slug}/lesson/${lesson.slug}`}>
                            <Button variant="outline" size="sm">
                              {isCompleted ? 'Review' : 'Start'}
                            </Button>
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
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
