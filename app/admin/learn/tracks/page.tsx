import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db/retry'
import { isDbUnreachableError } from '@/lib/db/errors'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { DbHealthBanner } from '@/components/admin/learning/DbHealthBanner'
import { AdminTracksUploadButton } from '@/components/admin/learning/AdminTracksUploadButton'
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
  try {
    const tracks = await withDbRetry(
      () =>
        prisma.track.findMany({
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
        }),
      { mode: 'read', operationName: 'admin_tracks_page_list' }
    )

    return { tracks, error: null as string | null }
  } catch (error) {
    if (isDbUnreachableError(error)) {
      return {
        tracks: [],
        error: 'Database temporarily unreachable. Track data cannot be loaded right now. Try again in 30 seconds.',
      }
    }
    throw error
  }
}

export default async function AdminTracksPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
    redirect('/login')
  }

  const { tracks, error } = await getTracks()

  return (
    <div className="min-h-screen bg-[#1a1815]">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-[var(--text-strong)]">Learning Tracks</h1>
                  <p className="text-[var(--text-strong)] mt-2">
                    Manage structured learning paths and educational content
                  </p>
                </div>
                <AdminTracksUploadButton
                  tracks={tracks.map((track) => ({ id: track.id, title: track.title }))}
                />
              </div>
            </div>

            <DbHealthBanner />
            {error && (
              <div className="mb-6 rounded-md border border-[#c03030] bg-[#2e1a1a] px-4 py-3 text-sm text-[#c03030]">
                {error}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-[var(--bg-panel)] p-6 rounded-lg shadow-sm border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-strong)]">Total Tracks</p>
                    <p className="text-2xl font-bold text-[var(--text-strong)]">{tracks.length}</p>
                  </div>
                  <div className="h-8 w-8 bg-[#1a1e2e] rounded-lg flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-[#4a7cc3]" />
                  </div>
                </div>
              </div>
              
              <div className="bg-[var(--bg-panel)] p-6 rounded-lg shadow-sm border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-strong)]">Published</p>
                    <p className="text-2xl font-bold text-[#4a7c3f]">
                      {tracks.filter(t => t.publishedAt).length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-[#1a2e1a] rounded-lg flex items-center justify-center">
                    <Eye className="h-4 w-4 text-[#4a7c3f]" />
                  </div>
                </div>
              </div>
              
              <div className="bg-[var(--bg-panel)] p-6 rounded-lg shadow-sm border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-strong)]">Draft</p>
                    <p className="text-2xl font-bold text-[#c9a227]">
                      {tracks.filter(t => !t.publishedAt).length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-[#2a2418] rounded-lg flex items-center justify-center">
                    <EyeOff className="h-4 w-4 text-[#c9a227]" />
                  </div>
                </div>
              </div>
              
              <div className="bg-[var(--bg-panel)] p-6 rounded-lg shadow-sm border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-strong)]">Total Students</p>
                    <p className="text-2xl font-bold text-[#9a6dd7]">
                      {tracks.reduce((sum, track) => sum + track._count.enrollments, 0)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-[#2a1e2e] rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-[#9a6dd7]" />
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
                    <thead className="bg-[#1a1815] border-b border-[var(--border-subtle)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Track
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Content
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Students
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {tracks.map((track) => {
                        const totalLessons = track.lessons.length
                        const totalDuration = track.lessons.reduce((sum, lesson) => sum + (lesson.durationMin || 0), 0)
                        
                        return (
                          <tr key={track.id} className="hover:bg-[#1a1815]">
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
                                  <div className="text-sm font-medium text-[var(--text-strong)]">
                                    {track.title}
                                  </div>
                                  <div className="text-sm text-[var(--text-muted)]">
                                    {track.summary}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {track.minTier} tier
                                    </Badge>
                                    <span className="text-xs text-[var(--text-muted)]">
                                      {totalLessons} lessons
                                    </span>
                                    {totalDuration > 0 && (
                                      <span className="text-xs text-[var(--text-muted)]">
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
                              <div className="text-sm text-[var(--text-strong)]">
                                {track.sections.length} sections
                              </div>
                              <div className="text-sm text-[var(--text-muted)]">
                                {totalLessons} lessons
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-[var(--text-muted)]" />
                                <span className="text-sm text-[var(--text-strong)]">
                                  {track._count.enrollments}
                                </span>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="text-sm text-[var(--text-strong)]">
                                {formatDate(track.createdAt)}
                              </div>
                              <div className="text-sm text-[var(--text-muted)]">
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
                                <Button variant="outline" size="sm" className="text-[#c03030] hover:text-[#c03030]">
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
                    <BookOpen className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-strong)] mb-2">No Tracks Created</h3>
                    <p className="text-[var(--text-strong)] mb-4">
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
