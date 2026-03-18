'use client'

import { ReactionType } from '@prisma/client'
import { CommentItem } from './CommentItem'
import { CommentComposer } from './CommentComposer'

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

interface CommentThreadProps {
  comments: CommentData[]
  currentUserId?: string
  isAdmin?: boolean
  onAddComment: (body: string, parentId?: string) => Promise<void>
  onReact: (commentId: string, type: ReactionType) => void
  onDelete: (commentId: string) => void
  hasMore?: boolean
  onLoadMore?: () => void
}

export function CommentThread({
  comments,
  currentUserId,
  isAdmin,
  onAddComment,
  onReact,
  onDelete,
  hasMore,
  onLoadMore,
}: CommentThreadProps) {
  async function handleReply(parentId: string, body: string) {
    await onAddComment(body, parentId)
  }

  return (
    <div>
      {/* Comment composer */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
        <CommentComposer onSubmit={(body) => onAddComment(body)} />
      </div>

      {/* Comments list */}
      <div className="px-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onReply={handleReply}
            onReact={onReact}
            onDelete={onDelete}
          />
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] py-6 text-center">
            No comments yet. Be the first to comment!
          </p>
        )}

        {hasMore && onLoadMore && (
          <button
            onClick={onLoadMore}
            className="w-full py-3 text-sm text-[var(--gold-400)] hover:underline"
          >
            Load more comments
          </button>
        )}
      </div>
    </div>
  )
}
