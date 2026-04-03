import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, User, Clock, Edit, Tag } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'
import { MDXRenderer } from '@/components/MDXRenderer'
import { renderMDX } from '@/lib/mdx'
import type { Metadata } from 'next'

export const revalidate = 300

async function getPost(slug: string) {
  return prisma.blogPost.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      subtitle: true,
      body: true,
      excerpt: true,
      category: true,
      tags: true,
      readingTime: true,
      platformOnly: true,
      featuredImage: true,
      status: true,
      publishedAt: true,
      author: {
        select: { id: true, name: true },
      },
    },
  })
}

const CATEGORY_LABELS: Record<string, string> = {
  'market-update': 'Market Update',
  'system-spotlight': 'System Spotlight',
  'industry-analysis': 'Industry Analysis',
  'webinar-recap': 'Webinar Recap',
  guide: 'Guide',
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: 'Not Found' }

  return {
    title: `${post.title} — Stewart & Co`,
    description: post.excerpt || post.subtitle || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.subtitle || undefined,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      ...(post.featuredImage && { images: [post.featuredImage] }),
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string }
}) {
  const session = await getSession()
  const user = session?.user

  const post = await getPost(params.slug)

  if (!post || post.status !== 'published') {
    notFound()
  }

  // Members-only post requires authentication
  if (post.platformOnly && !user) {
    redirect('/login?callbackUrl=/blog/' + params.slug)
  }

  const mdx = post.body
    ? await renderMDX(post.slug, post.body, {
        frontmatter: { title: post.title },
      })
    : null

  const isAdmin = user?.role === 'admin' || user?.role === 'editor'

  return (
    <div className="container-main section-padding">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/blog">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Blog
                </Button>
              </Link>
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABELS[post.category] || post.category}
              </Badge>
              {post.platformOnly && (
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 text-gold-400 border-gold-400/40"
                >
                  Members Only
                </Badge>
              )}
            </div>
            {isAdmin && (
              <Link href={`/admin/blog/${post.id}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
            )}
          </div>

          <h1 className="font-playfair text-4xl font-bold text-[var(--text-strong)] mb-3">
            {post.title}
          </h1>

          {post.subtitle && (
            <p className="text-xl text-[var(--text-muted)] mb-4 italic">
              {post.subtitle}
            </p>
          )}

          <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
            {post.author.name && (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {post.author.name}
              </span>
            )}
            {post.publishedAt && (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(post.publishedAt, 'PPP')}
              </span>
            )}
            {post.readingTime && (
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {post.readingTime} min read
              </span>
            )}
          </div>

          {post.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Tag className="h-4 w-4 text-[var(--text-muted)]" />
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full object-cover max-h-96"
            />
          </div>
        )}

        {/* Content */}
        <Card>
          <CardContent className="p-8">
            {mdx ? (
              <MDXRenderer
                source={mdx.source}
                slug={post.slug}
                hash={mdx.hash}
              />
            ) : post.body ? (
              <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                {post.body}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)]">
                  No content available.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
