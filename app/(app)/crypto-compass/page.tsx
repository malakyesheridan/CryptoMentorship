import { prisma } from '@/lib/prisma'
import { requireActiveSubscription } from '@/lib/access'
import AdminCryptoCompassUploadWrapper from '@/components/AdminCryptoCompassUploadWrapper'
import { CryptoCompassContent } from '@/components/cryptocompass/CryptoCompassContent'
import { CryptoCompassError } from '@/components/cryptocompass/CryptoCompassError'

export const revalidate = 300

export default async function CryptoCompassPage({
  searchParams
}: {
  searchParams: { cursor?: string; limit?: string; category?: string; search?: string; sort?: string }
}) {
  const user = await requireActiveSubscription()
  try {
    const limit = parseInt(searchParams.limit || '20')
    const cursor = searchParams.cursor
    const category = searchParams.category
    const search = searchParams.search
    const sort = searchParams.sort || 'newest'

    // Build where clause
    const where: any = {}
    if (category && category !== 'all') {
      where.category = category
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Build orderBy from sort param
    let orderBy: any = { publishedAt: 'desc' }
    switch (sort) {
      case 'oldest': orderBy = { publishedAt: 'asc' }; break
      case 'longest': orderBy = { duration: 'desc' }; break
      case 'shortest': orderBy = { duration: 'asc' }; break
    }

    // Fetch episodes and category counts in parallel
    const [episodesRaw, countsByCategory] = await Promise.all([
      prisma.episode.findMany({
        where,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          coverUrl: true,
          duration: true,
          publishedAt: true,
          locked: true,
          category: true,
        },
        orderBy,
        take: limit + 1,
        ...(cursor && { cursor: { slug: cursor }, skip: 1 }),
      }),
      prisma.episode.groupBy({
        by: ['category'],
        _count: true,
      }),
    ])

    const hasNextPage = episodesRaw.length > limit
    const episodes = (hasNextPage ? episodesRaw.slice(0, -1) : episodesRaw).map((ep) => ({
      slug: ep.slug,
      title: ep.title,
      summary: ep.excerpt ?? null,
      coverUrl: ep.coverUrl ?? null,
      duration: ep.duration,
      publishedAt: ep.publishedAt.toISOString(),
      locked: ep.locked,
      category: ep.category || 'daily-update',
    }))

    const nextCursor = hasNextPage ? episodes[episodes.length - 1]?.slug : null

    // Compute category counts
    const totalCount = countsByCategory.reduce((sum, c) => sum + c._count, 0)
    const categoryCounts = {
      all: totalCount,
      dailyUpdate: countsByCategory.find(c => c.category === 'daily-update')?._count ?? 0,
      analysis: countsByCategory.find(c => c.category === 'analysis')?._count ?? 0,
      breakdown: countsByCategory.find(c => c.category === 'breakdown')?._count ?? 0,
    }

    const userRole = user.role || 'guest'
    const userTier = (user as any)?.membershipTier || null

    return (
      <div className="min-h-screen bg-[var(--bg-page)]">
        <div className="container mx-auto px-4 py-8">
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">
                <span className="text-[var(--text-strong)]">Crypto </span>
                <span className="text-yellow-400">Compass</span>
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Weekly insights on crypto market trends and strategies
              </p>
            </div>
            <AdminCryptoCompassUploadWrapper userRole={userRole} />
          </div>

          {/* Episodes with Tabs */}
          <CryptoCompassContent
            episodes={episodes}
            userRole={userRole}
            userTier={userTier}
            pagination={{ hasNextPage, nextCursor, limit }}
            currentCategory={category}
            currentSearch={search}
            currentSort={sort}
            categoryCounts={categoryCounts}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error in CryptoCompassPage:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return <CryptoCompassError errorMessage={errorMessage} />
  }
}
