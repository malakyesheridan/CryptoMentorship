import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { handleError } from '@/lib/errors'
import { pushBlogToWebsite } from '@/lib/website-sync'
import { wrapInBrandedHTML, preprocessCustomComponents } from '@/lib/blog-html-template'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireRoleAPI(['admin'])

    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      include: { author: { select: { name: true } } },
    })

    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (post.status !== 'published') {
      return NextResponse.json(
        { error: 'Post must be published on the platform before pushing to website' },
        { status: 400 }
      )
    }

    // Generate branded HTML
    const processedBody = preprocessCustomComponents(post.body)
    const htmlBody = wrapInBrandedHTML({
      title: post.title,
      subtitle: post.subtitle,
      body: processedBody,
      publishedAt: post.publishedAt || new Date(),
      author: post.author.name || 'Stewart & Co',
      category: post.category,
    })

    // Cache the generated HTML
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { htmlBody },
    })

    await pushBlogToWebsite({
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle,
      content_html: htmlBody,
      content_mdx: post.body,
      excerpt: post.excerpt,
      category: post.category,
      tags: post.tags,
      featured_image: post.featuredImage,
      published_at: (post.publishedAt || new Date()).toISOString(),
      author: post.author.name || 'Stewart & Co',
      reading_time: post.readingTime,
      status: 'published',
    })

    await prisma.blogPost.update({
      where: { id: post.id },
      data: { websitePublishedAt: new Date() },
    })

    console.info('[blog] Post pushed to website', {
      userId: user.id,
      postId: post.id,
      slug: post.slug,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
