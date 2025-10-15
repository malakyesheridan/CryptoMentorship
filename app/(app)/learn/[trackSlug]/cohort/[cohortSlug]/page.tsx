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
  Play, 
  CheckCircle,
  Lock,
  Users,
  Calendar,
  ArrowLeft,
  Award,
  UserPlus,
  UserMinus
} from 'lucide-react'
import Link from 'next/link'
import { enrollInCohort, leaveCohort } from '@/lib/actions/cohorts'
import { getCohortProgress, formatRelativeTime } from '@/lib/cohorts'

export const dynamic = 'force-dynamic'

async function getCohort(trackSlug: string, cohortSlug: string) {
  const cohort = await prisma.cohort.findFirst({
    where: {
      slug: cohortSlug,
      track: { slug: trackSlug },
    },
    include: {
      track: {
        select: {
          id: true,
          slug: true,
          title: true,
          minTier: true,
          publishedAt: true,
        },
      },
      enrollments: {
        select: { id: true },
      },
      releases: {
        include: {
          lesson: {
            select: {
              id: true,
              slug: true,
              title: true,
              durationMin: true,
              publishedAt: true,
            },
          },
        },
        orderBy: { releaseAt: 'asc' },
      },
    },
  })

  return cohort
}

async function getUserEnrollment(userId: string, cohortId: string) {
  const enrollment = await prisma.cohortEnrollment.findUnique({
    where: {
      cohortId_userId: {
        cohortId,
        userId,
      },
    },
  })

  return enrollment
}

async function getUserProgress(userId: string, cohortId: string) {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: {
      track: { select: { id: true } },
    },
  })

  if (!cohort) return null

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
  }
}

export default async function CohortDashboardPage({
  params
}: {
  params: { trackSlug: string; cohortSlug: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  const cohort = await getCohort(params.trackSlug, params.cohortSlug)
  
  if (!cohort) {
    redirect('/learn')
  }

  const [enrollment, userProgress] = await Promise.all([
    getUserEnrollment(session.user.id, cohort.id),
    getUserProgress(session.user.id, cohort.id),
  ])

  const tierLevels = { guest: 0, member: 1, editor: 2, admin: 3 }
  const userTierLevel = tierLevels[session.user.role as keyof typeof tierLevels] || 0
  const hasAccess = userTierLevel >= tierLevels[cohort.track.minTier as keyof typeof tierLevels]

  const now = new Date()
  const isEnrolled = !!enrollment
  const isActive = cohort.startsAt <= now && (!cohort.endsAt || cohort.endsAt >= now)
  const isUpcoming = cohort.startsAt > now
  const isPast = cohort.endsAt && cohort.endsAt < now

  // Separate released and locked lessons
  const releasedLessons = cohort.releases.filter(release => 
    release.releaseAt <= now && release.lesson.publishedAt
  )
  const lockedLessons = cohort.releases.filter(release => 
    release.releaseAt > now && release.lesson.publishedAt
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/learn/${cohort.track.slug}`}>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Track
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{cohort.title}</h1>
                <Badge 
                  variant={isActive ? 'default' : isUpcoming ? 'secondary' : 'outline'}
                  className={isActive ? 'bg-green-600' : ''}
                >
                  {isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Past'}
                </Badge>
              </div>
              <p className="text-slate-600">{cohort.description}</p>
            </div>
          </div>

          {/* Cohort Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Lessons</p>
                  <p className="text-2xl font-bold text-slate-900">{cohort.releases.length}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Released</p>
                  <p className="text-2xl font-bold text-green-600">{releasedLessons.length}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Locked</p>
                  <p className="text-2xl font-bold text-yellow-600">{lockedLessons.length}</p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Lock className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Members</p>
                  <p className="text-2xl font-bold text-purple-600">{cohort.enrollments.length}</p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isEnrolled && userProgress && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Your Progress</h3>
                <span className="text-sm text-slate-600">
                  {userProgress.completedLessons} of {userProgress.totalReleasedLessons} released lessons completed
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div 
                  className="bg-gold-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${userProgress.progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mb-8">
            {!hasAccess ? (
              <Button disabled size="lg">
                <Lock className="h-5 w-5 mr-2" />
                Upgrade to {cohort.track.minTier} tier to access this cohort
              </Button>
            ) : !isEnrolled ? (
              <form action={async () => {
                'use server'
                await enrollInCohort({ cohortId: cohort.id, role: 'member' })
              }}>
                <Button type="submit" size="lg">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Join Cohort
                </Button>
              </form>
            ) : (
              <form action={async () => {
                'use server'
                await leaveCohort(cohort.id)
              }}>
                <Button type="submit" variant="outline" size="lg">
                  <UserMinus className="h-5 w-5 mr-2" />
                  Leave Cohort
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Schedule Timeline */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">Learning Schedule</h2>
          
          {/* Released Lessons */}
          {releasedLessons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Available Lessons
                </CardTitle>
                <CardDescription>
                  These lessons are now available for you to complete
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {releasedLessons.map((release) => (
                    <div
                      key={release.id}
                      className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-slate-900">{release.lesson.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            {release.lesson.durationMin && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {release.lesson.durationMin}m
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Released {release.releaseAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isEnrolled && (
                        <Link href={`/learn/${cohort.track.slug}/lesson/${release.lesson.slug}`}>
                          <Button>
                            <Play className="h-4 w-4 mr-2" />
                            Start Lesson
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Locked Lessons */}
          {lockedLessons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-yellow-600" />
                  Upcoming Lessons
                </CardTitle>
                <CardDescription>
                  These lessons will be released according to the schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lockedLessons.map((release) => (
                    <div
                      key={release.id}
                      className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Lock className="h-4 w-4 text-yellow-600" />
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-slate-900">{release.lesson.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            {release.lesson.durationMin && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {release.lesson.durationMin}m
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatRelativeTime(release.releaseAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button disabled variant="outline">
                        <Lock className="h-4 w-4 mr-2" />
                        Locked
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {cohort.releases.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Lessons Scheduled</h3>
                <p className="text-slate-600">
                  This cohort doesn&apos;t have any lessons scheduled yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
