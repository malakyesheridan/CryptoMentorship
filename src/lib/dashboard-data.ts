import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

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

export const getRecentEpisodes = unstable_cache(
  async () => {
    const episodes = await prisma.episode.findMany({
      where: {
        publishedAt: { lte: new Date() },
      },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverUrl: true,
        duration: true,
        publishedAt: true,
        category: true,
        locked: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 4,
    })
    return episodes
  },
  ['dashboard-episodes'],
  { revalidate: 60, tags: ['dashboard-episodes'] }
)

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
