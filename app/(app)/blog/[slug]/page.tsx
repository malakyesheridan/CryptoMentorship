import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import Link from 'next/link'
import { wrapInBrandedHTML, preprocessCustomComponents } from '@/lib/blog-html-template'
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
      htmlBody: true,
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

  const isAdmin = user?.role === 'admin' || user?.role === 'editor'

  // Generate branded HTML if not cached
  let brandedHtml = post.htmlBody
  if (!brandedHtml && post.body) {
    const processedBody = preprocessCustomComponents(post.body)
    brandedHtml = wrapInBrandedHTML({
      title: post.title,
      subtitle: post.subtitle,
      body: processedBody,
      publishedAt: post.publishedAt,
      author: post.author.name || 'Stewart & Co',
      category: post.category,
    })
  }

  return (
    <div className="container-main section-padding">
      <div className="max-w-4xl mx-auto">
        {/* Navigation bar */}
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

        {/* Branded HTML content */}
        {brandedHtml ? (
          <div
            className="rounded-lg overflow-hidden"
            dangerouslySetInnerHTML={{ __html: brandedHtml }}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">No content available.</p>
          </div>
        )}
      </div>
    </div>
  )
}
