import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, User, Tag, Edit } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'
import { ViewTracker } from '@/components/ViewTracker'
import { MDXRenderer } from '@/components/MDXRenderer'
import { renderMDX } from '@/lib/mdx'
import { BookmarkButton } from '@/components/BookmarkButton'

// Revalidate every 5 minutes - content is published, not real-time
export const revalidate = 300

async function getContent(slug: string) {
  const content = await prisma.content.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      kind: true,
      title: true,
      excerpt: true,
      body: true,
      coverUrl: true,
      publishedAt: true,
      locked: true,
      minTier: true,
      tags: true,
      createdAt: true,
    },
  })

  return content
}

export default async function ContentPage({
  params
}: {
  params: { slug: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  const content = await getContent(params.slug)
  
  if (!content) {
    redirect('/not-found')
  }

  // Check access
  const tierLevels = { guest: 0, member: 1, editor: 2, admin: 3 }
  const userTierLevel = tierLevels[session.user.role as keyof typeof tierLevels] || 0
  const requiredTierLevel = tierLevels[content.minTier as keyof typeof tierLevels] || 0

  if (content.locked && userTierLevel < requiredTierLevel) {
    redirect('/dashboard')
  }

  const tags = JSON.parse(content.tags || '[]')
  const mdx = content.body
    ? await renderMDX(content.slug, content.body, { frontmatter: { title: content.title } })
    : null

  const existingBookmark = await prisma.bookmark.findFirst({
    where: {
      userId: session.user.id,
      contentId: content.id,
    },
    select: { id: true },
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ViewTracker entityType="content" entityId={content.id} disabled={!session.user?.id} />
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/resources">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Resources
                </Button>
              </Link>
              <Badge variant="secondary" className="capitalize">
                {content.kind}
              </Badge>
            </div>
            {['admin', 'editor'].includes(session.user.role || '') && (
              <Link href={`/admin/content/${content.id}/edit`}>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Content
                </Button>
              </Link>
            )}
          </div>
          
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">{content.title}</h1>
              {content.excerpt && (
                <p className="text-xl text-slate-600">{content.excerpt}</p>
              )}
            </div>
            <BookmarkButton
              contentId={content.id}
              isBookmarked={Boolean(existingBookmark)}
              size="md"
              className="self-start"
            />
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatDate(content.publishedAt, 'PPP')}
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Published
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Tag className="h-4 w-4 text-slate-400" />
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-8">
            {mdx ? (
              <MDXRenderer source={mdx.source} slug={content.slug} hash={mdx.hash} />
            ) : content.body ? (
              <div className="prose prose-slate max-w-none whitespace-pre-wrap">
                {content.body}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500">No content available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
