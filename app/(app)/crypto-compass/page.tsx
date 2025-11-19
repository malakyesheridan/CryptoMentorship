import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { Play, Calendar } from 'lucide-react'
import AdminCryptoCompassUploadWrapper from '@/components/AdminCryptoCompassUploadWrapper'
import { CryptoCompassContent } from '@/components/cryptocompass/CryptoCompassContent'
import { CryptoCompassError } from '@/components/cryptocompass/CryptoCompassError'

// Revalidate every 5 minutes - episodes are published content, not real-time
export const revalidate = 300

export default async function CryptoCompassPage({ 
  searchParams 
}: { 
  searchParams: { cursor?: string; limit?: string; category?: string; search?: string } 
}) {
  try {
    const limit = parseInt(searchParams.limit || '20')
    const cursor = searchParams.cursor
    const category = searchParams.category
    const search = searchParams.search
    
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
    
    // Fetch episodes with pagination
    const episodesRaw = await prisma.episode.findMany({
      where,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverUrl: true,
        publishedAt: true,
        locked: true,
        category: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { slug: cursor }, skip: 1 }),
    })
    
    const hasNextPage = episodesRaw.length > limit
    const episodes = (hasNextPage ? episodesRaw.slice(0, -1) : episodesRaw).map((ep) => ({
      slug: ep.slug,
      title: ep.title,
      summary: ep.excerpt ?? null,
      coverUrl: ep.coverUrl ?? '/images/placeholders/episode-cover.jpg',
      publishedAt: ep.publishedAt.toISOString(),
      locked: ep.locked,
      category: ep.category || 'daily-update',
    }))
    
    const nextCursor = hasNextPage ? episodes[episodes.length - 1]?.slug : null

    const session = await getSession()
    const userRole = session?.user?.role || 'guest'
    const userTier = (session?.user as any)?.membershipTier || null

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
          <div className="relative container mx-auto px-4 py-20 text-center">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6">
                <span className="text-white">Crypto </span>
                <span className="text-yellow-400">Compass</span>
              </h1>
              <p className="text-xl text-slate-300 mb-8">
                Weekly insights on crypto market trends, macroeconomics, and investment strategies
              </p>
              <div className="flex items-center justify-center gap-6 text-slate-400 flex-wrap">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  <span className="font-medium">{episodes.length} Episodes</span>
                </div>
                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">Weekly Updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Admin Upload Section */}
          <div className="mb-12">
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