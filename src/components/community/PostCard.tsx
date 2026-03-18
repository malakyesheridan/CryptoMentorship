'use client'

import Link from 'next/link'
import { PostContent } from './PostContent'
import { PostActions } from './PostActions'
import { CATEGORY_LABELS, CATEGORY_COLORS, REACTION_EMOJI } from '@/lib/community/constants'
import { MessageCircle, Pin } from 'lucide-react'
import type { PostCategory, ReactionType } from '@prisma/client'

interface PostAuthor {
  id: string
  name: string | null
  image: string | null
  role: string
}

interface PostCardProps {
  post: {
    id: string
    body: string
    imageUrl: string | null
    category: PostCategory
    isPinned: boolean
    commentCount: number
    reactionCount: number
    reactionCounts?: Partial<Record<ReactionType, number>>
    createdAt: string
    editedAt: string | null
    author: PostAuthor
    userReactions: ReactionType[]
  }
  currentUserId?: string
  isAdmin?: boolean
  onDelete?: (postId: string) => void
  onReact?: (postId: string, type: ReactionType) => void
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return new Date(date).toLocaleDateString()
}

export function PostCard({ post, currentUserId, isAdmin, onDelete, onReact }: PostCardProps) {
  const isAuthor = currentUserId === post.author.id
  const categoryColor = CATEGORY_COLORS[post.category]

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] hover:border-[var(--border-subtle)]/80 transition-all">
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-[var(--gold-400)] text-xs px-5 pt-3 font-medium">
          <Pin className="w-3 h-3" />
          Pinned
        </div>
      )}

      <div className="flex gap-3.5 p-5 pt-4">
        {/* Avatar */}
        <Link href={`/community/${post.id}`} className="shrink-0">
          {post.author.image ? (
            <img src={post.author.image} alt="" className="w-12 h-12 rounded-full ring-2 ring-[var(--border-subtle)]" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#2a2520] ring-2 ring-[var(--border-subtle)] flex items-center justify-center text-base font-semibold text-[var(--text-muted)]">
              {(post.author.name?.[0] ?? '?').toUpperCase()}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <span className="text-[15px] font-semibold text-[var(--text-strong)] truncate">
                {post.author.name ?? 'Anonymous'}
              </span>
              {(post.author.role === 'admin' || post.author.role === 'editor') && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--gold-400)]/20 text-[var(--gold-400)] font-semibold uppercase tracking-wide">
                  {post.author.role === 'admin' ? 'Admin' : 'Editor'}
                </span>
              )}
              <span className="text-xs text-[var(--text-muted)]">{timeAgo(post.createdAt)}</span>
              {post.editedAt && <span className="text-xs text-[var(--text-muted)] italic">(edited)</span>}
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${categoryColor.bg} ${categoryColor.text}`}>
                {CATEGORY_LABELS[post.category]}
              </span>
            </div>
            <PostActions
              postId={post.id}
              isAuthor={isAuthor}
              isAdmin={!!isAdmin}
              isPinned={post.isPinned}
              onDelete={onDelete ? () => onDelete(post.id) : undefined}
            />
          </div>

          {/* Body */}
          <Link href={`/community/${post.id}`} className="block mt-2">
            <PostContent body={post.body} imageUrl={post.imageUrl} />
          </Link>

          {/* Reactions + Comments */}
          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-[var(--border-subtle)]">
            {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => {
              const isActive = post.userReactions?.includes(type)
              const count = post.reactionCounts?.[type] || 0
              return (
                <button
                  key={type}
                  onClick={(e) => { e.preventDefault(); onReact?.(post.id, type) }}
                  className={`flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[var(--gold-400)]/15 text-[var(--gold-400)] ring-1 ring-[var(--gold-400)]/30'
                      : 'text-[var(--text-muted)] hover:bg-[#1a1815] hover:text-[var(--text-strong)]'
                  }`}
                  title={type.charAt(0) + type.slice(1).toLowerCase()}
                >
                  <span className="text-base">{REACTION_EMOJI[type]}</span>
                  {count > 0 && <span className="text-xs font-medium">{count}</span>}
                </button>
              )
            })}
            <Link
              href={`/community/${post.id}`}
              className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)] ml-auto px-2.5 py-1.5 rounded-lg hover:bg-[#1a1815] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">{post.commentCount > 0 ? post.commentCount : ''}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
