'use client'

import { useCallback, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { ReactionType } from '@prisma/client'
import { FeedLayout } from '@/components/community/FeedLayout'
import { PostContent } from '@/components/community/PostContent'
import { PostActions } from '@/components/community/PostActions'
import { ReactionBar } from '@/components/community/ReactionBar'
import { CommentThread } from '@/components/community/CommentThread'
import { CATEGORY_LABELS } from '@/lib/community/constants'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'editor'

  const { data: post, mutate: mutatePost } = useSWR(
    `/api/community/posts/${postId}`,
    fetcher
  )

  const getCommentsKey = (pageIndex: number, prev: any) => {
    if (prev && !prev.hasNextPage) return null
    const params = new URLSearchParams({ limit: '20' })
    if (pageIndex > 0 && prev?.nextCursor) params.set('cursor', prev.nextCursor)
    return `/api/community/posts/${postId}/comments?${params.toString()}`
  }

  const {
    data: commentPages,
    size,
    setSize,
    mutate: mutateComments,
  } = useSWRInfinite(getCommentsKey, fetcher, { revalidateOnFocus: false })

  const comments = commentPages ? commentPages.flatMap((p: any) => p.comments ?? []) : []
  const hasMoreComments = commentPages ? commentPages[commentPages.length - 1]?.hasNextPage : false

  const handleReactPost = useCallback(async (type: ReactionType) => {
    const res = await fetch(`/api/community/posts/${postId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    if (res.ok) mutatePost()
  }, [postId, mutatePost])

  const handleAddComment = useCallback(async (body: string, parentId?: string) => {
    const res = await fetch(`/api/community/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, parentId }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error || 'Failed to add comment')
      return
    }
    mutateComments()
    mutatePost()
  }, [postId, mutateComments, mutatePost])

  const handleReactComment = useCallback(async (commentId: string, type: ReactionType) => {
    const res = await fetch(`/api/community/comments/${commentId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    if (res.ok) mutateComments()
  }, [mutateComments])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!confirm('Delete this comment?')) return
    const res = await fetch(`/api/community/comments/${commentId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Comment deleted')
      mutateComments()
      mutatePost()
    } else {
      toast.error('Failed to delete comment')
    }
  }, [mutateComments, mutatePost])

  const handleDeletePost = useCallback(async () => {
    if (!confirm('Delete this post?')) return
    const res = await fetch(`/api/community/posts/${postId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Post deleted')
      router.push('/community')
    } else {
      toast.error('Failed to delete post')
    }
  }, [postId, router])

  if (!post || post.error) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)]">
        <FeedLayout>
          <div className="text-center py-12">
            {post?.error ? (
              <p className="text-[var(--text-muted)]">{post.error}</p>
            ) : (
              <div className="w-8 h-8 border-2 border-[var(--gold-400)] border-t-transparent rounded-full animate-spin mx-auto" />
            )}
          </div>
        </FeedLayout>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <FeedLayout>
        {/* Back link */}
        <Link
          href="/community"
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Community
        </Link>

        {/* Post */}
        <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-panel)] overflow-hidden">
          <div className="px-4 py-4">
            {/* Author */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {post.author.image ? (
                  <img src={post.author.image} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#2a2520] flex items-center justify-center text-sm font-medium text-[var(--text-muted)]">
                    {(post.author.name?.[0] ?? '?').toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-strong)]">
                      {post.author.name ?? 'Anonymous'}
                    </span>
                    {(post.author.role === 'admin' || post.author.role === 'editor') && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--gold-400)]/20 text-[var(--gold-400)] font-medium">
                        {post.author.role === 'admin' ? 'Admin' : 'Editor'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>{timeAgo(post.createdAt)}</span>
                    {post.editedAt && <span>(edited)</span>}
                    <span className="px-1.5 py-0.5 rounded-full border border-[var(--border-subtle)]">
                      {CATEGORY_LABELS[post.category as keyof typeof CATEGORY_LABELS]}
                    </span>
                  </div>
                </div>
              </div>
              <PostActions
                postId={post.id}
                isAuthor={session?.user?.id === post.authorId}
                isAdmin={!!isAdmin}
                isPinned={post.isPinned}
                onDelete={handleDeletePost}
              />
            </div>

            {/* Body */}
            <div className="mt-3">
              <PostContent body={post.body} imageUrl={post.imageUrl} truncate={false} />
            </div>

            {/* Reactions */}
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
              <ReactionBar
                userReactions={post.userReactions ?? []}
                reactionCount={post.reactionCount ?? 0}
                onReact={handleReactPost}
              />
            </div>
          </div>

          {/* Comments section */}
          <div className="border-t border-[var(--border-subtle)]">
            <div className="px-4 py-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-strong)]">
                {post.commentCount ?? 0} Comments
              </span>
            </div>

            <CommentThread
              comments={comments}
              currentUserId={session?.user?.id}
              isAdmin={isAdmin}
              onAddComment={handleAddComment}
              onReact={handleReactComment}
              onDelete={handleDeleteComment}
              hasMore={hasMoreComments}
              onLoadMore={() => setSize(size + 1)}
            />
          </div>
        </div>
      </FeedLayout>
    </div>
  )
}
