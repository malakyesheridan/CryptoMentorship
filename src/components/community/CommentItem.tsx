'use client'

import { useState } from 'react'
import { ReactionType } from '@prisma/client'
import { ReactionBar } from './ReactionBar'
import { CommentComposer } from './CommentComposer'
import { MessageCircle, Trash2 } from 'lucide-react'

interface CommentAuthor {
  id: string
  name: string | null
  image: string | null
  role: string
}

interface CommentData {
  id: string
  postId: string
  body: string
  depth: number
  createdAt: string
  editedAt: string | null
  replyCount: number
  reactionCount: number
  userReactions: ReactionType[]
  author: CommentAuthor
  replies: CommentData[]
}

interface CommentItemProps {
  comment: CommentData
  currentUserId?: string
  isAdmin?: boolean
  onReply: (parentId: string, body: string) => Promise<void>
  onReact: (commentId: string, type: ReactionType) => void
  onDelete: (commentId: string) => void
  maxDepth?: number
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function CommentItem({ comment, currentUserId, isAdmin, onReply, onReact, onDelete, maxDepth = 5 }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const isAuthor = currentUserId === comment.author.id
  const canNest = comment.depth < maxDepth

  async function handleReply(body: string) {
    await onReply(comment.id, body)
    setShowReplyForm(false)
  }

  return (
    <div className={comment.depth > 0 ? 'ml-6 border-l border-[var(--border-subtle)] pl-4' : ''}>
      <div className="py-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          {comment.author.image ? (
            <img src={comment.author.image} alt="" className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#2a2520] flex items-center justify-center text-[10px] font-medium text-[var(--text-muted)]">
              {(comment.author.name?.[0] ?? '?').toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-[var(--text-strong)]">
            {comment.author.name ?? 'Anonymous'}
          </span>
          {(comment.author.role === 'admin' || comment.author.role === 'editor') && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--gold-400)]/20 text-[var(--gold-400)] font-medium">
              {comment.author.role === 'admin' ? 'Admin' : 'Editor'}
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)]">{timeAgo(comment.createdAt)}</span>
          {comment.editedAt && <span className="text-xs text-[var(--text-muted)]">(edited)</span>}
        </div>

        {/* Body */}
        <p className="text-sm text-[var(--text-strong)] mt-1 whitespace-pre-wrap break-words">
          {comment.body}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-2">
          <ReactionBar
            userReactions={comment.userReactions}
            reactionCount={comment.reactionCount}
            onReact={(type) => onReact(comment.id, type)}
          />
          {canNest && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-strong)] flex items-center gap-1"
            >
              <MessageCircle className="w-3 h-3" />
              Reply
            </button>
          )}
          {(isAuthor || isAdmin) && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-xs text-[var(--text-muted)] hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Reply form */}
        {showReplyForm && (
          <div className="mt-3">
            <CommentComposer
              onSubmit={handleReply}
              placeholder={`Reply to ${comment.author.name ?? 'Anonymous'}...`}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies.length > 0 && !collapsed && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onReply={onReply}
              onReact={onReact}
              onDelete={onDelete}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}

      {/* Collapse/expand toggle */}
      {comment.replyCount > comment.replies.length && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs text-[var(--gold-400)] hover:underline ml-6 mt-1"
        >
          {collapsed ? `Show ${comment.replyCount} replies` : `${comment.replyCount - comment.replies.length} more replies`}
        </button>
      )}
    </div>
  )
}
