import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getActiveSystems } from '@/lib/system-registry'

/**
 * Dashboard data fetching functions — all wrapped in unstable_cache
 * with dashboard-specific tags for targeted invalidation.
 */

export const getDashboardUser = (userId: string) =>
  unstable_cache(
    async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          image: true,
          createdAt: true,
        },
      })
      const membership = await prisma.membership.findFirst({
        where: { userId },
        select: {
          tier: true,
          status: true,
        },
      })
      return { user, membership }
    },
    [`dashboard-user-${userId}`],
    { revalidate: 300, tags: [`dashboard-user-${userId}`] }
  )()

export const getLatestDailyUpdate = unstable_cache(
  async () => {
    const episode = await prisma.episode.findFirst({
      where: {
        category: 'daily-update',
        publishedAt: { lte: new Date() },
      },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverUrl: true,
        duration: true,
        publishedAt: true,
        locked: true,
      },
      orderBy: { publishedAt: 'desc' },
    })
    return episode
  },
  ['dashboard-daily-update'],
  { revalidate: 60, tags: ['dashboard-daily-update'] }
)

/**
 * Latest portfolio signal per system the user is following.
 *
 * Following resolves via UserSystemAssignment with default-all opt-out
 * semantics (matches the email digest + /portfolio cards):
 *   - User has NO assignment rows → following every active system.
 *   - Has rows → only the systems with isActive=true count as followed.
 *
 * One row per followed system (latest by publishedAt). Systems with zero
 * signals in PortfolioDailySignal yet are omitted from the result —
 * matches the "no card if no data" behaviour the digest already uses.
 * Output order follows registry sortOrder, so the dashboard matches the
 * order on /portfolio.
 */
export const getLatestSignals = (userId: string) =>
  unstable_cache(
    async () => {
      const registry = getActiveSystems()
      if (registry.length === 0) return []

      const allAssignments = await prisma.userSystemAssignment.findMany({
        where: { userId },
        select: { systemSlug: true, isActive: true },
      })

      const hasAnyAssignmentRows = allAssignments.length > 0
      const optInSlugs = new Set(
        allAssignments.filter((a) => a.isActive).map((a) => a.systemSlug)
      )
      const followedSystems = hasAnyAssignmentRows
        ? registry.filter((s) => optInSlugs.has(s.slug))
        : registry

      if (followedSystems.length === 0) return []

      const latestPerSystem = await Promise.all(
        followedSystems.map((sys) =>
          prisma.portfolioDailySignal.findFirst({
            where: {
              category: sys.slug,
              publishedAt: { lte: new Date() },
            },
            select: {
              id: true,
              tier: true,
              category: true,
              riskProfile: true,
              signal: true,
              executiveSummary: true,
              publishedAt: true,
            },
            orderBy: { publishedAt: 'desc' },
          })
        )
      )

      // followedSystems is already sorted by registry sortOrder via
      // getActiveSystems(), so the surviving signals come out in that order.
      return latestPerSystem.filter(
        (s): s is NonNullable<typeof s> => s !== null
      )
    },
    [`dashboard-signals-${userId}`],
    {
      revalidate: 60,
      tags: [`dashboard-signals-${userId}`, 'dashboard-signals'],
    }
  )()

export const getAnnouncements = unstable_cache(
  async () => {
    const posts = await prisma.post.findMany({
      where: {
        isShadowHidden: false,
        OR: [
          { category: 'ANNOUNCEMENTS' },
          { isPinned: true },
        ],
      },
      select: {
        id: true,
        body: true,
        category: true,
        isPinned: true,
        createdAt: true,
        commentCount: true,
        reactionCount: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 3,
    })
    return posts
  },
  ['dashboard-announcements'],
  { revalidate: 60, tags: ['dashboard-announcements'] }
)
