import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://crypto-portal.com'
  
  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/research`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/signals`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/learn`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/resources`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
  ]

  try {
    // Dynamic pages from database
    const [events, tracks, signals, content] = await Promise.all([
      prisma.event.findMany({
        select: { slug: true, updatedAt: true }
      }),
      prisma.track.findMany({
        where: { publishedAt: { not: null } },
        select: { slug: true, updatedAt: true }
      }),
      prisma.signalTrade.findMany({
        select: { slug: true, updatedAt: true }
      }),
      prisma.content.findMany({
        where: { publishedAt: { not: null as any } },
        select: { slug: true, updatedAt: true }
      })
    ])

    // Event pages
    const eventPages = events.map((event) => ({
      url: `${baseUrl}/events/${event.slug}`,
      lastModified: event.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // Track pages
    const trackPages = tracks.map((track) => ({
      url: `${baseUrl}/learn/${track.slug}`,
      lastModified: track.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))

    // Signal pages
    const signalPages = signals.map((signal) => ({
      url: `${baseUrl}/signals/${signal.slug}`,
      lastModified: signal.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // Content pages
    const contentPages = content.map((item) => ({
      url: `${baseUrl}/content/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))

    return [
      ...staticPages,
      ...eventPages,
      ...trackPages,
      ...signalPages,
      ...contentPages,
    ]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    // Return static pages only if database is unavailable
    return staticPages
  }
}
