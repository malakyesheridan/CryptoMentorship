'use client'

import Link from 'next/link'
import { PostContent } from './PostContent'
import { PostActions } from './PostActions'
import { CATEGORY_LABELS, REACTION_EMOJI } from '@/lib/community/constants'
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

  return (
    <div className="border-b border-[var(--border-subtle)] px-4 py-4 hover:bg-[#1a1815]/50 transition-colors">
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs mb-2 ml-10">
          <Pin className="w-3 h-3" />
          Pinned
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {post.author.image ? (
            <img src={post.author.image} alt="" className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#2a2520] flex items-center justify-center text-sm font-medium text-[var(--text-muted)]">
              {(post.author.name?.[0] ?? '?').toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-[var(--text-strong)] truncate">
                {post.author.name ?? 'Anonymous'}
              </span>
              {(post.author.role === 'admin' || post.author.role === 'editor') && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--gold-400)]/20 text-[var(--gold-400)] font-medium">
                  {post.author.role === 'admin' ? 'Admin' : 'Editor'}
                </span>
              )}
              <span className="text-xs text-[var(--text-muted)]">·</span>
              <span className="text-xs text-[var(--text-muted)]">{timeAgo(post.createdAt)}</span>
              {post.editedAt && <span className="text-xs text-[var(--text-muted)]">(edited)</span>}
              <span className="text-xs text-[var(--text-muted)] px-1.5 py-0.5 rounded-full border border-[var(--border-subtle)]">
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
          <Link href={`/community/${post.id}`} className="block mt-1">
            <PostContent body={post.body} imageUrl={post.imageUrl} />
          </Link>

          {/* Reactions + Comments */}
          <div className="flex items-center gap-3 mt-3">
            {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => {
              const isActive = post.userReactions?.includes(type)
              return (
                <button
                  key={type}
                  onClick={(e) => { e.preventDefault(); onReact?.(post.id, type) }}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                    isActive
                      ? 'bg-[var(--gold-400)]/20 text-[var(--gold-400)]'
                      : 'text-[var(--text-muted)] hover:bg-[#1a1815] hover:text-[var(--text-strong)]'
                  }`}
                >
                  {REACTION_EMOJI[type]}
                </button>
              )
            })}
            <Link
              href={`/community/${post.id}`}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-strong)] ml-auto"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {post.commentCount > 0 && post.commentCount}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
