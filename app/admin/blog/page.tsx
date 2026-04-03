import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/SectionHeader'
import { EmptyState } from '@/components/EmptyState'
import { PenLine, Plus, Eye, Edit, FileText, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

const CATEGORY_LABELS: Record<string, string> = {
  'market-update': 'Market Update',
  'system-spotlight': 'System Spotlight',
  'industry-analysis': 'Industry Analysis',
  'webinar-recap': 'Webinar Recap',
  guide: 'Guide',
}

const getBlogData = unstable_cache(
  async () => {
    const [posts, totalCount, publishedCount, draftCount] = await Promise.all([
      prisma.blogPost.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
          status: true,
          readingTime: true,
          platformOnly: true,
          publishedAt: true,
          createdAt: true,
          author: {
            select: { name: true },
          },
        },
        take: 50,
      }),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { status: 'published' } }),
      prisma.blogPost.count({ where: { status: 'draft' } }),
    ])
    return { posts, totalCount, publishedCount, draftCount }
  },
  ['admin-blog-posts'],
  { revalidate: 60, tags: ['admin-blog-posts'] }
)

export default async function AdminBlogPage() {
  const { posts, totalCount, publishedCount, draftCount } = await getBlogData()

  return (
    <div className="container-main section-padding">
      <SectionHeader
        title="Blog Posts"
        subtitle="Create and manage blog content with AI-assisted writing"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-strong)]">Total Posts</p>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{totalCount}</p>
              </div>
              <FileText className="h-8 w-8 text-[var(--text-muted)]" />
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
                <p className="text-sm text-[var(--text-strong)]">Drafts</p>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{draftCount}</p>
              </div>
              <Clock className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end mb-6">
        <Button asChild className="btn-gold">
          <Link href="/admin/blog/new">
            <Plus className="h-4 w-4 mr-2" />
            New Blog Post
          </Link>
        </Button>
      </div>

      {/* Posts Table */}
      {posts.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Post</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Category</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Status</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Author</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Created</th>
                  <th className="text-right text-sm font-medium text-[var(--text-muted)] px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-sm text-[var(--text-strong)]">{post.title}</p>
                        {post.excerpt && (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1 max-w-md">{post.excerpt}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {post.readingTime && (
                            <span className="text-xs text-[var(--text-muted)]">{post.readingTime} min read</span>
                          )}
                          {post.platformOnly && (
                            <Badge variant="outline" className="text-[10px] py-0">Members Only</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[post.category] || post.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {post.status === 'published' ? (
                        <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">Published</Badge>
                      ) : post.status === 'archived' ? (
                        <Badge variant="outline" className="text-xs text-[var(--text-muted)]">Archived</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Draft</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[var(--text-muted)]">{post.author.name || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[var(--text-muted)]">{formatDate(post.createdAt, 'dd-MM-yyyy')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {post.status === 'published' && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/blog/${post.slug}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/blog/${post.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<PenLine />}
          title="No blog posts yet"
          description="Create your first blog post with AI-assisted writing."
          action={{
            label: 'New Blog Post',
            href: '/admin/blog/new',
          }}
        />
      )}
    </div>
  )
}
