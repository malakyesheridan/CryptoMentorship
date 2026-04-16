import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { handleError } from '@/lib/errors'
import { z } from 'zod'

const WebhookBlogSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  subtitle: z.string().max(300).optional(),
  body: z.string().min(1, 'Body is required'),
  htmlBody: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  category: z.enum([
    'market-update',
    'system-spotlight',
    'industry-analysis',
    'webinar-recap',
    'guide',
  ]),
  tags: z.array(z.string()).default([]),
  featuredImage: z.string().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'published']).default('draft'),
  platformOnly: z.boolean().default(false),
})

function verifyAuth(request: NextRequest): boolean {
  const secret = process.env.INBOUND_WEBHOOK_SECRET
  if (!secret) return false

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7)
  // Constant-time comparison to prevent timing attacks
  if (token.length !== secret.length) return false
  let mismatch = 0
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ secret.charCodeAt(i)
  }
  return mismatch === 0
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function calculateReadingTime(body: string): number {
  const words = body.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

async function getWebhookAuthorId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!admin) throw new Error('No admin user found to assign as author')
  return admin.id
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody = await request.json()
    const data = WebhookBlogSchema.parse(rawBody)

    // Generate slug, ensure uniqueness
    let slug = generateSlug(data.title)
    const existing = await prisma.blogPost.findUnique({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const readingTime = calculateReadingTime(data.body)
    const publishedAt = data.status === 'published' ? new Date() : null
    const authorId = await getWebhookAuthorId()

    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        subtitle: data.subtitle || null,
        slug,
        body: data.body,
        htmlBody: data.htmlBody || null,
        excerpt: data.excerpt || null,
        category: data.category,
        tags: data.tags,
        featuredImage: data.featuredImage || null,
        status: data.status,
        platformOnly: data.platformOnly,
        readingTime,
        publishedAt,
        authorId,
      },
    })

    revalidateTag('admin-blog-posts')

    return NextResponse.json(
      {
        success: true,
        post: {
          id: post.id,
          slug: post.slug,
          title: post.title,
          status: post.status,
          publishedAt: post.publishedAt,
          url: `/blog/${post.slug}`,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    if (!slug) {
      return NextResponse.json(
        { error: 'slug query parameter is required' },
        { status: 400 }
      )
    }

    const existing = await prisma.blogPost.findUnique({ where: { slug } })
    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const rawBody = await request.json()
    const data = WebhookBlogSchema.partial().parse(rawBody)

    const readingTime = data.body
      ? calculateReadingTime(data.body)
      : undefined

    // Set publishedAt when transitioning to published
    let publishedAt: Date | undefined
    if (data.status === 'published' && existing.status !== 'published') {
      publishedAt = new Date()
    }

    const post = await prisma.blogPost.update({
      where: { slug },
      data: {
        ...data,
        featuredImage: data.featuredImage === '' ? null : data.featuredImage,
        readingTime,
        ...(publishedAt && { publishedAt }),
      },
    })

    revalidateTag('admin-blog-posts')

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        status: post.status,
        publishedAt: post.publishedAt,
        url: `/blog/${post.slug}`,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
