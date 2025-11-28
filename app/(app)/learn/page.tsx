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
  TrendingUp,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

// Revalidate every 5 minutes - learning tracks are published content
export const revalidate = 300

async function getTracks() {
  const tracks = await prisma.track.findMany({
    where: {
      publishedAt: { not: null },
    },
    take: 50, // Limit to 50 tracks max
    include: {
      sections: {
        include: {
          lessons: {
            where: { publishedAt: { not: null } },
            select: { id: true, durationMin: true },
          },
        },
      },
      lessons: {
        where: { publishedAt: { not: null } },
        select: { id: true, durationMin: true },
      },
      _count: {
        select: {
          sections: true,
          lessons: true,
        },
      },
    },
    orderBy: [
      { order: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  return tracks
}

async function getUserProgress(userId: string) {
  const progress = await prisma.lessonProgress.findMany({
    where: { userId },
    include: {
      lesson: {
        select: { 
          id: true,
          trackId: true,
          track: {
            select: { id: true, slug: true, title: true },
          },
        },
      },
    },
  })

  // Group by track and calculate progress
  const trackProgress: Record<string, any> = {}
  progress.forEach(p => {
    if (p.lesson.trackId) {
      if (!trackProgress[p.lesson.trackId]) {
        trackProgress[p.lesson.trackId] = {
          trackId: p.lesson.trackId,
          track: p.lesson.track,
          completedLessons: 0,
        }
      }
      if (p.completedAt) {
        trackProgress[p.lesson.trackId].completedLessons++
      }
    }
  })

  return trackProgress
}

export default async function LearningPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  const [tracks, userProgress] = await Promise.all([
    getTracks(),
    getUserProgress(session.user.id),
  ])

  const tierLevels = { guest: 0, member: 1, editor: 2, admin: 3 }
  const userTierLevel = tierLevels[session.user.role as keyof typeof tierLevels] || 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <Link href="/learning">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Learning Hub
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-gold-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Learning Paths</h1>
              <p className="text-slate-600 mt-2">
                Structured courses to master cryptocurrency trading and analysis
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Available Tracks</p>
                  <p className="text-2xl font-bold text-slate-900">{tracks.length}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Tracks Started</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Object.keys(userProgress).length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Lessons</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {tracks.reduce((sum, track) => sum + (track._count.lessons || 0), 0)}
                  </p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tracks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track) => {
            const progress = userProgress[track.id]
            const hasAccess = userTierLevel >= tierLevels[track.minTier as keyof typeof tierLevels]
            
            // Calculate total duration
            const totalDuration = track.lessons.reduce((sum, lesson) => sum + (lesson.durationMin || 0), 0)
            
            // Count total lessons
            const totalLessons = track.lessons.length

            return (
              <Card key={track.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  {track.coverUrl && (
                    <div className="aspect-video relative mb-4 rounded-lg overflow-hidden">
                      <Image
                        src={track.coverUrl}
                        alt={track.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{track.title}</CardTitle>
                      <CardDescription className="text-sm text-slate-600 line-clamp-2">
                        {track.summary}
                      </CardDescription>
                    </div>
                    
                    {!hasAccess && (
                      <Lock className="h-5 w-5 text-slate-400 ml-2 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Track Stats */}
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{totalLessons} lessons</span>
                    </div>
                    {totalDuration > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{Math.round(totalDuration / 60)}h {totalDuration % 60}m</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {progress && totalLessons > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-medium">
                          {progress.completedLessons > 0 ? `${Math.round((progress.completedLessons / totalLessons) * 100)}%` : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-gold-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.completedLessons > 0 ? Math.round((progress.completedLessons / totalLessons) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tier Badge */}
                  <div className="mb-4">
                    <Badge 
                      variant={track.minTier === 'member' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {track.minTier} tier
                    </Badge>
                  </div>

                  {/* Action Button */}
                  <div className="flex gap-2">
                    {!hasAccess ? (
                      <Button disabled className="flex-1">
                        <Lock className="h-4 w-4 mr-2" />
                        Upgrade Required
                      </Button>
                    ) : progress ? (
                      <Link href={`/learn/${track.slug}`} className="flex-1">
                        <Button className="w-full">
                          {progress.completedLessons === totalLessons ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Watch Again
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Continue
                            </>
                          )}
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/learn/${track.slug}`} className="flex-1">
                        <Button className="w-full">
                          <Play className="h-4 w-4 mr-2" />
                          Start Track
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {tracks.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Learning Tracks Available</h3>
            <p className="text-slate-600">
              Check back soon for new educational content!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
