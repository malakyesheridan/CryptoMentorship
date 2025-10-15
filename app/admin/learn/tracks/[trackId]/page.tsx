import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/SectionHeader'
import { 
  BookOpen, 
  Clock, 
  Users, 
  Edit,
  Trash2,
  ArrowLeft,
  Play,
  CheckCircle,
  Lock
} from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering for admin pages (auth-gated)
export const dynamic = 'force-dynamic'

interface TrackDetailPageProps {
  params: {
    trackId: string
  }
}

async function getTrack(trackId: string) {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      sections: {
        include: {
          lessons: {
            include: {
              quiz: true,
              progresses: true
            },
            orderBy: {
              order: 'asc'
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      },
      enrollments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      }
    }
  })

  return track
}

export default async function TrackDetailPage({ params }: TrackDetailPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/admin')
  }

  const track = await getTrack(params.trackId)

  if (!track) {
    redirect('/admin/learn/tracks')
  }

  const totalLessons = track.sections.reduce((acc, section) => acc + section.lessons.length, 0)
  const publishedLessons = track.sections.reduce((acc, section) => 
    acc + section.lessons.filter(lesson => lesson.publishedAt).length, 0
  )
  const enrollmentCount = track.enrollments.length

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/admin/learn/tracks">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tracks
            </Button>
          </Link>
          
          <SectionHeader
            title={track.title}
            subtitle="Track Details"
            actions={
              <div className="flex gap-2">
                <Link href={`/admin/learn/tracks/${track.id}/edit`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Track Info */}
            <Card>
              <CardHeader>
                <CardTitle>Track Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Summary</h4>
                  <p className="text-slate-600">{track.summary || 'No summary provided'}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">
                      {totalLessons} lessons ({publishedLessons} published)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">{enrollmentCount} enrollments</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={track.publishedAt ? 'default' : 'secondary'}>
                    {track.publishedAt ? 'Published' : 'Draft'}
                  </Badge>
                  <Badge variant="outline">
                    {track.minTier || 'All Members'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Sections & Lessons */}
            <Card>
              <CardHeader>
                <CardTitle>Course Structure</CardTitle>
                <CardDescription>
                  {track.sections.length} sections with {totalLessons} lessons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {track.sections.map((section) => (
                    <div key={section.id} className="border-l-2 border-slate-200 pl-4">
                      <h4 className="font-medium text-slate-900 mb-2">{section.title}</h4>
                      {section.summary && (
                        <p className="text-sm text-slate-600 mb-3">{section.summary}</p>
                      )}
                      
                      <div className="space-y-2">
                        {section.lessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center gap-2 text-sm">
                            {lesson.publishedAt ? (
                              <Play className="h-3 w-3 text-green-500" />
                            ) : (
                              <Lock className="h-3 w-3 text-slate-400" />
                            )}
                            <span className={lesson.publishedAt ? 'text-slate-700' : 'text-slate-400'}>
                              {lesson.title}
                            </span>
                            {lesson.durationMin && (
                              <span className="text-slate-500">({lesson.durationMin}m)</span>
                            )}
                            {lesson.quiz && (
                              <Badge variant="outline" className="text-xs">
                                Quiz
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Track Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Total Lessons</span>
                  </div>
                  <span className="font-medium">{totalLessons}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Published</span>
                  </div>
                  <span className="font-medium">{publishedLessons}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Enrollments</span>
                  </div>
                  <span className="font-medium">{enrollmentCount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/admin/learn/tracks/${track.id}/edit`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Track
                  </Button>
                </Link>
                
                <Link href={`/learn/${track.slug}`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Play className="h-4 w-4 mr-2" />
                    Preview Track
                  </Button>
                </Link>
                
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  View Enrollments
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
