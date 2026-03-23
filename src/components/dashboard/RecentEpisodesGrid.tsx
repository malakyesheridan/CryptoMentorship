import Image from 'next/image'
import Link from 'next/link'
import { Clock, Lock, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'

interface Episode {
  slug: string
  title: string
  excerpt: string | null
  coverUrl: string | null
  duration: number | null
  publishedAt: Date
  category: string
  locked: boolean
}

interface RecentEpisodesGridProps {
  episodes: Episode[]
  hasSubscription: boolean
}

const categoryLabels: Record<string, string> = {
  'daily-update': 'Daily Update',
  analysis: 'Analysis',
  breakdown: 'Breakdown',
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function RecentEpisodesGrid({ episodes, hasSubscription }: RecentEpisodesGridProps) {
  if (episodes.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[var(--text-strong)]">Crypto Compass</h2>
        <Link
          href="/crypto-compass"
          className="flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300 transition-colors"
        >
          View All
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {episodes.map((ep) => {
          const isLocked = ep.locked && !hasSubscription
          return (
            <Link
              key={ep.slug}
              href={`/crypto-compass/${ep.slug}`}
              className="group block overflow-hidden rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-gold-400/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Cover */}
              <div className="relative aspect-video bg-[#2a2520]">
                {ep.coverUrl ? (
                  <Image
                    src={ep.coverUrl}
                    alt={ep.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gold-600/10 to-transparent" />
                )}
                {isLocked && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <Lock className="h-6 w-6 text-gold-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-2">
                <Badge variant="secondary" className="text-xs">
                  {categoryLabels[ep.category] ?? ep.category}
                </Badge>
                <h3 className="font-medium text-[var(--text-strong)] line-clamp-2 group-hover:text-gold-400 transition-colors">
                  {ep.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  {ep.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(ep.duration)}
                    </span>
                  )}
                  <span>{formatDate(ep.publishedAt)}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
