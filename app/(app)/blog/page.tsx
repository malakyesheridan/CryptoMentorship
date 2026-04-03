import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/SectionHeader'
import { EmptyState } from '@/components/EmptyState'
import { PenLine, Clock, User } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

const CATEGORY_LABELS: Record<string, string> = {
  'market-update': 'Market Update',
  'system-spotlight': 'System Spotlight',
  'industry-analysis': 'Industry Analysis',
  'webinar-recap': 'Webinar Recap',
  guide: 'Guide',
}

const getPublishedPosts = unstable_cache(
  async () => {
    return prisma.blogPost.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        subtitle: true,
        excerpt: true,
        category: true,
        readingTime: true,
        platformOnly: true,
        featuredImage: true,
        publishedAt: true,
        tags: true,
        author: {
          select: { name: true },
        },
      },
      take: 50,
    })
  },
  ['published-blog-posts'],
  { revalidate: 120, tags: ['admin-blog-posts'] }
)

export default async function BlogPage() {
  const session = await getSession()
  const isAuthenticated = !!session?.user
  const allPosts = await getPublishedPosts()

  // Non-authenticated users only see public posts
  const posts = isAuthenticated
    ? allPosts
    : allPosts.filter((p) => !p.platformOnly)

  return (
    <div className="container-main section-padding">
      <SectionHeader
        title="Blog"
        subtitle="Market commentary, system insights, and strategy guides"
      />

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <Card className="group h-full transition-colors hover:border-gold-400/40">
                {post.featuredImage && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[post.category] || post.category}
                    </Badge>
                    {post.platformOnly && (
                      <Badge variant="outline" className="text-[10px] py-0 text-gold-400 border-gold-400/40">
                        Members Only
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-playfair font-bold text-xl text-[var(--text-strong)] mb-2 group-hover:text-gold-400 transition-colors">
                    {post.title}
                  </h3>

                  {(post.subtitle || post.excerpt) && (
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4">
                      {post.subtitle || post.excerpt}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    {post.author.name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.author.name}
                      </span>
                    )}
                    {post.publishedAt && (
                      <span>{formatDate(post.publishedAt, 'short')}</span>
                    )}
                    {post.readingTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readingTime} min
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<PenLine />}
          title="No blog posts yet"
          description="Check back soon for market commentary and strategy insights."
        />
      )}
    </div>
  )
}
