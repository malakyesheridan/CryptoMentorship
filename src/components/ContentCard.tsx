'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'
import { canViewContent } from '@/lib/content-utils'
import { BookmarkButton } from '@/components/BookmarkButton'
import { FollowTagButton } from '@/components/FollowTagButton'
import { useBookmarks } from '@/hooks/usePersonalization'

interface ContentCardProps {
  id: string
  title: string
  excerpt?: string
  publishedAt: Date
  locked: boolean
  kind: 'research' | 'macro' | 'signal' | 'resource'
  tags?: string[]
  user?: { role: string; membershipTier?: string }
}

export function ContentCard({ id, title, excerpt, publishedAt, locked, kind, tags = [], user }: ContentCardProps) {
  const { isBookmarked } = useBookmarks()
  const canAccess = user ? canViewContent(user.role, user.membershipTier || null, null, locked) : !locked
  
  return (
    <div className="card p-6 hover:shadow-xl transition-all duration-200 group-hover:scale-[1.02]">
      <div className="flex items-start justify-between mb-3">
        <Link href={canAccess ? `/content/${id}` : '#'} className="flex-1 group">
          <h3 className="heading-2 text-xl group-hover:text-gold-600 transition-colors">
            {title}
          </h3>
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <BookmarkButton 
            contentId={id} 
            isBookmarked={isBookmarked(id)} 
            size="sm"
          />
          {locked && !canAccess && (
            <Badge variant="locked">LOCKED</Badge>
          )}
          {locked && canAccess && (
            <Badge variant="preview">PREVIEW</Badge>
          )}
        </div>
      </div>
      
      {excerpt && (
        <p className="subhead mb-4 line-clamp-3">
          {excerpt}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.slice(0, 3).map((tag) => (
            <FollowTagButton key={tag} tag={tag} size="sm" />
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-slate-500 px-2 py-1">
              +{tags.length - 3} more
            </span>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span className="capitalize">{kind}</span>
        <span>{formatDate(publishedAt)}</span>
      </div>
      
      {locked && !canAccess && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="subhead text-sm mb-2">
            This content is available to members only.
          </p>
          <button className="text-sm text-gold-600 font-medium hover:text-gold-700">
            Upgrade to access →
          </button>
        </div>
      )}
    </div>
  )
}
