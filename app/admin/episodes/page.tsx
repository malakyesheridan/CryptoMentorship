import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/SectionHeader'
import { EmptyState } from '@/components/EmptyState'
import { Video, Plus, Eye, Edit, Trash2, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

export const dynamic = 'force-dynamic'

export default async function AdminEpisodesPage() {
  const [episodes, totalCount, publishedCount, draftCount] = await Promise.all([
    prisma.episode.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        publishedAt: true,
        publishAt: true,
        createdAt: true,
        videoUrl: true,
        _count: {
          select: {
            bookmarks: true,
          },
        },
      },
      take: 50,
    }),
    prisma.episode.count(),
    prisma.episode.count({ where: { publishedAt: { lte: new Date() } } }),
    prisma.episode.count({ where: { publishedAt: { gt: new Date() } } }),
  ])

  return (
    <div className="container-main section-padding">
      <SectionHeader
        title="Episodes"
        subtitle="Manage Crypto Compass episodes and video content"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-strong)]">Total Episodes</p>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{totalCount}</p>
              </div>
              <Video className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-strong)]">Published</p>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{publishedCount}</p>
              </div>
              <Eye className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-strong)]">Scheduled</p>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{draftCount}</p>
              </div>
              <Clock className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end mb-6">
        <Button asChild>
          <Link href="/admin/episodes/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Episode
          </Link>
        </Button>
      </div>

      {/* Episodes Table */}
      {episodes.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Episode</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Category</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Status</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Bookmarks</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Created</th>
                  <th className="text-right text-sm font-medium text-[var(--text-muted)] px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((episode) => {
                  const isPublished = episode.publishedAt <= new Date()
                  return (
                    <tr key={episode.id} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-sm text-[var(--text-strong)]">{episode.title}</p>
                          {episode.excerpt && (
                            <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1 max-w-md">{episode.excerpt}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize text-xs">
                          {episode.category.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {isPublished ? (
                          <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">Published</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Scheduled</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--text-muted)]">{episode._count.bookmarks}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--text-muted)]">{formatDate(episode.createdAt, 'dd-MM-yyyy')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/crypto-compass/${episode.slug}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/episodes/${episode.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<Video />}
          title="No episodes yet"
          description="Create your first Crypto Compass episode."
          action={{
            label: 'Create Episode',
            href: '/admin/episodes/new',
          }}
        />
      )}
    </div>
  )
}
