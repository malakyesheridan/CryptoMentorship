import { notFound } from 'next/navigation'
import { getEpisodeById } from '@/lib/content'
import { getSession } from '@/lib/auth-server'
import { formatContentDate } from '@/lib/content'
import { formatDate } from '@/lib/dates'
import { renderMDX } from '@/lib/mdx'
import { prisma } from '@/lib/prisma'
import { MDXRenderer } from '@/components/MDXRenderer'
import { BookmarkButton } from '@/components/BookmarkButton'
import { ViewTracker } from '@/components/ViewTracker'
import VideoPlayer from '@/components/VideoPlayer'
import Link from 'next/link'
import { ArrowLeft, Calendar, Lock, Eye, Play, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Revalidate every 5 minutes - episodes are published content
export const revalidate = 300

interface EpisodePageProps {
  params: {
    slug: string
  }
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const episode = await getEpisodeById(params.slug)
  
  if (!episode) {
    notFound()
  }

  const session = await getSession()
  const userRole = session?.user?.role || 'guest'
  const userTier = session?.user?.membershipTier || null
  
  // All episodes are accessible to everyone
  const canView = true
  
  // Process MDX content
  const mdx = episode.body ? await renderMDX(episode.slug, episode.body) : null
  const existingBookmark = session?.user?.id
    ? await prisma.bookmark.findFirst({
        where: { userId: session.user.id, episodeId: episode.id },
        select: { id: true },
      })
    : null

  return (
    <div className="container-main section-padding">
      {/* Track view event */}
      <ViewTracker entityType="episode" entityId={episode.id} disabled={!session?.user?.id} />
      
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-[var(--text-muted)] mb-8">
        <Link href="/" className="hover:text-[var(--text-strong)]">Home</Link>
        <span>/</span>
        <Link href="/crypto-compass" className="hover:text-[var(--text-strong)]">Crypto Compass</Link>
        <span>/</span>
        <span className="text-[var(--text-strong)]">{episode.title}</span>
      </nav>

      {/* Back button and Edit */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/crypto-compass">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Crypto Compass
          </Button>
        </Link>
        {['admin', 'editor'].includes(userRole) && (
          <Link href={`/admin/episodes/${episode.id}/edit`}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Episode
            </Button>
          </Link>
        )}
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge className="badge-preview">
                <Play className="w-3 h-3 mr-1" />
                Episode
              </Badge>
              {episode.locked && (
                <Badge className={canView ? "badge-preview" : "badge-locked"}>
                  {canView ? <Eye className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                  {canView ? 'Preview' : 'Locked'}
                </Badge>
              )}
            </div>
              <BookmarkButton
                episodeId={episode.id}
                size="md"
                isBookmarked={Boolean(existingBookmark)}
              />
          </div>
          
          <h1 className="heading-hero text-4xl sm:text-5xl mb-4">
            {episode.title}
          </h1>
          
          <div className="flex items-center gap-4 text-[var(--text-muted)] text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatContentDate(episode.createdAt)}
            </div>
          </div>
        </div>

        {/* Video Player */}
        {episode.videoUrl && canView ? (
          <div className="mb-8">
            <VideoPlayer
              src={episode.videoUrl}
              title={episode.title}
              poster={episode.coverUrl || undefined}
              className="w-full"
            />
          </div>
        ) : episode.videoUrl && !canView ? (
          <div className="mb-8">
            <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Premium Episode</p>
                  <p className="text-sm opacity-75">Upgrade to watch this episode</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Cover Image */}
        {episode.coverUrl && (
          <div className="mb-8">
            <img
              src={episode.coverUrl}
              alt={episode.title}
              className="w-full h-64 sm:h-80 object-cover rounded-2xl"
            />
          </div>
        )}

        {/* Content */}
        {canView ? (
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
        ) : (
          <div className="card p-8 text-center">
            <Lock className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Premium Episode</h3>
            <p className="text-[var(--text-muted)] mb-6">{episode.excerpt}</p>
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                This episode requires premium membership
              </p>
              <Button asChild className="btn-gold">
                <Link href="/apply">Apply for Access</Link>
              </Button>
            </div>
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
