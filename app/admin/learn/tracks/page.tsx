import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Users,
  Clock,
  Calendar,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate } from '@/lib/dates'

export const dynamic = 'force-dynamic'

async function getTracks() {
  const tracks = await prisma.track.findMany({
    include: {
      sections: {
        include: {
          lessons: {
            select: { id: true, durationMin: true },
          },
        },
      },
      lessons: {
        select: { id: true, durationMin: true },
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
    orderBy: [
      { order: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  return tracks
}

export default async function AdminTracksPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
    redirect('/login')
  }

  const tracks = await getTracks()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Learning Tracks</h1>
                  <p className="text-slate-600 mt-2">
                    Manage structured learning paths and educational content
                  </p>
                </div>
                <Link href="/admin/learn/tracks/new">
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Track
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Tracks</p>
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
                    <p className="text-sm font-medium text-slate-600">Published</p>
                    <p className="text-2xl font-bold text-green-600">
                      {tracks.filter(t => t.publishedAt).length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Eye className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Draft</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {tracks.filter(t => !t.publishedAt).length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <EyeOff className="h-4 w-4 text-yellow-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Students</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {tracks.reduce((sum, track) => sum + track._count.enrollments, 0)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tracks Table */}
            <Card>
              <CardHeader>
                <CardTitle>Tracks Overview</CardTitle>
                <CardDescription>
                  Manage all learning tracks and their content
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Track
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Content
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Students
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tracks.map((track) => {
                        const totalLessons = track.lessons.length
                        const totalDuration = track.lessons.reduce((sum, lesson) => sum + (lesson.durationMin || 0), 0)
                        
                        return (
                          <tr key={track.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {track.coverUrl && (
                                  <div className="h-12 w-16 relative rounded overflow-hidden">
                                    <Image
                                      src={track.coverUrl}
                                      alt={track.title}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-medium text-slate-900">
                                    {track.title}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    {track.summary}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {track.minTier} tier
                                    </Badge>
                                    <span className="text-xs text-slate-500">
                                      {totalLessons} lessons
                                    </span>
                                    {totalDuration > 0 && (
                                      <span className="text-xs text-slate-500">
                                        {Math.round(totalDuration / 60)}h {totalDuration % 60}m
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <Badge 
                                variant={track.publishedAt ? 'default' : 'secondary'}
                                className={track.publishedAt ? 'bg-green-600' : ''}
                              >
                                {track.publishedAt ? 'Published' : 'Draft'}
                              </Badge>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-900">
                                {track.sections.length} sections
                              </div>
                              <div className="text-sm text-slate-500">
                                {totalLessons} lessons
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-slate-400" />
                                <span className="text-sm text-slate-900">
                                  {track._count.enrollments}
                                </span>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-900">
                                {formatDate(track.createdAt)}
                              </div>
                              <div className="text-sm text-slate-500">
                                {track.createdAt.toLocaleTimeString()}
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link href={`/learn/${track.slug}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Link href={`/admin/learn/tracks/${track.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                
                {tracks.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tracks Created</h3>
                    <p className="text-slate-600 mb-4">
                      Create your first learning track to get started.
                    </p>
                    <Link href="/admin/learn/tracks/new">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Track
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
