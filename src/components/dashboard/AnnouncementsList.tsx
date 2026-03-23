import Image from 'next/image'
import Link from 'next/link'
import { Megaphone, Pin, MessageCircle, Heart, ArrowRight } from 'lucide-react'
import { formatRelative } from '@/lib/dates'
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState'

interface Announcement {
  id: string
  body: string
  category: string
  isPinned: boolean
  createdAt: Date
  commentCount: number
  reactionCount: number
  author: {
    id: string
    name: string | null
    image: string | null
    role: string
  }
}

interface AnnouncementsListProps {
  announcements: Announcement[]
}

export function AnnouncementsList({ announcements }: AnnouncementsListProps) {
  if (announcements.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text-strong)]">Announcements</h2>
        </div>
        <DashboardEmptyState
          icon={<Megaphone className="h-8 w-8" />}
          title="No announcements"
          description="When there are important updates, they'll appear here."
        />
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[var(--text-strong)]">Announcements</h2>
        <Link
          href="/community"
          className="flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300 transition-colors"
        >
          View All
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {announcements.map((post) => (
          <Link
            key={post.id}
            href={`/community?post=${post.id}`}
            className="group block rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-gold-400/40 p-4 transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              {/* Author avatar */}
              <div className="relative h-9 w-9 rounded-full overflow-hidden bg-[#2a2520] shrink-0">
                {post.author.image ? (
                  <Image
                    src={post.author.image}
                    alt={post.author.name ?? 'Author'}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm font-medium text-[var(--text-muted)]">
                    {(post.author.name ?? '?')[0].toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Author + metadata */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[var(--text-strong)]">
                    {post.author.name ?? 'Unknown'}
                  </span>
                  {post.isPinned && (
                    <Pin className="h-3 w-3 text-gold-400" />
                  )}
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatRelative(post.createdAt)}
                  </span>
                </div>

                {/* Body preview */}
                <p className="text-sm text-[var(--text-muted)] line-clamp-3">
                  {post.body}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                  {post.reactionCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {post.reactionCount}
                    </span>
                  )}
                  {post.commentCount > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {post.commentCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
