import Image from 'next/image'
import Link from 'next/link'
import { Play, Lock, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState'

interface DailyUpdateHeroProps {
  episode: {
    slug: string
    title: string
    excerpt: string | null
    coverUrl: string | null
    duration: number | null
    publishedAt: Date
    locked: boolean
  } | null
  hasSubscription: boolean
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function DailyUpdateHero({ episode, hasSubscription }: DailyUpdateHeroProps) {
  if (!episode) {
    return (
      <DashboardEmptyState
        icon={<Play className="h-8 w-8" />}
        title="No daily updates yet"
        description="Check back soon for the latest daily update."
      />
    )
  }

  const isLocked = episode.locked && !hasSubscription

  return (
    <Link
      href={`/crypto-compass/${episode.slug}`}
      className="group block relative overflow-hidden rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-gold-400/40 transition-all duration-300"
    >
      {/* Cover image */}
      <div className="relative h-64 sm:h-72 lg:h-80 w-full">
        {episode.coverUrl ? (
          <Image
            src={episode.coverUrl}
            alt={episode.title}
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gold-600/20 to-[var(--bg-panel)]" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
          <div className="space-y-3 max-w-2xl">
            <Badge variant="preview">Daily Update</Badge>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
              {episode.title}
            </h2>
            {episode.excerpt && (
              <p className="text-sm sm:text-base text-white/70 line-clamp-2">
                {episode.excerpt}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-white/60">
              {episode.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(episode.duration)}
                </span>
              )}
              <span>{formatDate(episode.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-gold-400 group-hover:text-gold-300 font-medium text-sm transition-colors">
              <Play className="h-4 w-4" />
              Watch Now
            </div>
          </div>
        </div>

        {/* Lock overlay for free users */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center space-y-3">
              <Lock className="h-10 w-10 text-gold-400 mx-auto" />
              <p className="text-white font-medium">Upgrade to watch</p>
              <span className="inline-block px-4 py-1.5 bg-gold-500 text-black text-sm font-semibold rounded-full">
                Subscribe
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
