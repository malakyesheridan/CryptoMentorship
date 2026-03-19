import { notFound } from 'next/navigation'
import { getEpisodeById } from '@/lib/content'
import { requireActiveSubscription } from '@/lib/access'
import { formatContentDate } from '@/lib/content'
import { renderMDX } from '@/lib/mdx'
import { prisma } from '@/lib/prisma'
import { MDXRenderer } from '@/components/MDXRenderer'
import { BookmarkButton } from '@/components/BookmarkButton'
import { ViewTracker } from '@/components/ViewTracker'
import VideoPlayer from '@/components/VideoPlayer'
import Link from 'next/link'
import { ArrowLeft, Calendar, Play, Edit, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const revalidate = 300

interface EpisodePageProps {
  params: {
    slug: string
  }
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const user = await requireActiveSubscription()
  const episode = await getEpisodeById(params.slug)

  if (!episode) {
    notFound()
  }

  const userRole = user?.role || 'guest'
  const coverUrl =
    episode.coverUrl && (episode.coverUrl.startsWith('http') || episode.coverUrl.startsWith('/'))
      ? episode.coverUrl
      : null

  // Process MDX content and fetch related data in parallel
  const [mdx, existingBookmark, prevEpisode, nextEpisode] = await Promise.all([
    episode.body ? renderMDX(episode.slug, episode.body) : null,
    user?.id
      ? prisma.bookmark.findFirst({
          where: { userId: user.id, episodeId: episode.id },
          select: { id: true },
        })
      : null,
    prisma.episode.findFirst({
      where: { publishedAt: { lt: episode.publishedAt } },
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, title: true },
    }),
    prisma.episode.findFirst({
      where: { publishedAt: { gt: episode.publishedAt } },
      orderBy: { publishedAt: 'asc' },
      select: { slug: true, title: true },
    }),
  ])

  return (
    <div className="container-main section-padding">
      {/* Track view event */}
      <ViewTracker entityType="episode" entityId={episode.id} disabled={!user?.id} />

      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-[var(--text-muted)] mb-6">
        <Link href="/" className="hover:text-[var(--text-strong)]">Home</Link>
        <span>/</span>
        <Link href="/crypto-compass" className="hover:text-[var(--text-strong)]">Crypto Compass</Link>
        <span>/</span>
        <span className="text-[var(--text-strong)] truncate max-w-[200px]">{episode.title}</span>
      </nav>

      {/* Back button and Edit */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/crypto-compass">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        {['admin', 'editor'].includes(userRole) && (
          <Link href={`/admin/episodes/${episode.id}/edit`}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        )}
      </div>

      {/* Video Player — wider container */}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Badge className="badge-preview">
                <Play className="w-3 h-3 mr-1" />
                Episode
              </Badge>
            </div>
            <BookmarkButton
              episodeId={episode.id}
              size="md"
              isBookmarked={Boolean(existingBookmark)}
            />
          </div>

          <h1 className="heading-hero text-3xl sm:text-4xl lg:text-5xl mb-3">
            {episode.title}
          </h1>

          <div className="flex items-center gap-4 text-[var(--text-muted)] text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatContentDate(episode.createdAt)}
            </div>
          </div>
        </div>

        {/* Video */}
        {episode.videoUrl && (
          <div className="mb-8">
            <VideoPlayer
              src={episode.videoUrl}
              title={episode.title}
              poster={coverUrl || undefined}
              className="w-full aspect-video"
            />
          </div>
        )}
      </div>

      {/* Content — narrower container for readability */}
      <div className="max-w-4xl mx-auto">
        {/* Cover Image (if no video) */}
        {!episode.videoUrl && coverUrl && (
          <div className="mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt={episode.title}
              className="w-full h-64 sm:h-80 object-cover rounded-2xl"
            />
          </div>
        )}

        {/* Episode Content */}
        <div>
          {episode.excerpt && (
            <div className="text-lg text-[var(--text-muted)] mb-6">
              {episode.excerpt}
            </div>
          )}
          {mdx ? (
            <MDXRenderer source={mdx.source} slug={episode.slug} hash={mdx.hash} />
          ) : (
            <div className="text-[var(--text-muted)] italic">
              Episode notes coming soon...
            </div>
          )}
        </div>

        {/* Previous / Next Navigation */}
        {(prevEpisode || nextEpisode) && (
          <div className="flex items-stretch gap-4 mt-12 pt-8 border-t border-[var(--border-subtle)]">
            {prevEpisode ? (
              <Link
                href={`/crypto-compass/${prevEpisode.slug}`}
                className="flex-1 group bg-[var(--bg-panel)] rounded-xl p-4 border border-[var(--border-subtle)] hover:border-yellow-500/30 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
                  <ChevronLeft className="w-3 h-3" />
                  Previous Episode
                </div>
                <p className="text-sm font-medium text-[var(--text-strong)] group-hover:text-yellow-500 transition-colors line-clamp-1">
                  {prevEpisode.title}
                </p>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {nextEpisode ? (
              <Link
                href={`/crypto-compass/${nextEpisode.slug}`}
                className="flex-1 group bg-[var(--bg-panel)] rounded-xl p-4 border border-[var(--border-subtle)] hover:border-yellow-500/30 transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-2 text-xs text-[var(--text-muted)] mb-1">
                  Next Episode
                  <ChevronRight className="w-3 h-3" />
                </div>
                <p className="text-sm font-medium text-[var(--text-strong)] group-hover:text-yellow-500 transition-colors line-clamp-1">
                  {nextEpisode.title}
                </p>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: EpisodePageProps) {
  const episode = await getEpisodeById(params.slug)

  if (!episode) {
    return {
      title: 'Episode Not Found'
    }
  }

  return {
    title: episode.title,
    description: episode.excerpt || `Watch ${episode.title} on Crypto Portal`,
  }
}
