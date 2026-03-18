'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import useSWRInfinite from 'swr/infinite'
import { PostCategory, ReactionType } from '@prisma/client'
import { FeedLayout } from '@/components/community/FeedLayout'
import { CategoryTabs } from '@/components/community/CategoryTabs'
import { PostComposer } from '@/components/community/PostComposer'
import { PostCard } from '@/components/community/PostCard'
import { NewPostsBanner } from '@/components/community/NewPostsBanner'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Helper: toggle a reaction in a post object (returns new post)
function togglePostReaction(post: any, type: ReactionType, userId: string) {
  const userReactions: ReactionType[] = post.userReactions ?? []
  const reactionCounts = { ...post.reactionCounts }
  const wasActive = userReactions.includes(type)

  return {
    ...post,
    userReactions: wasActive
      ? userReactions.filter((r: ReactionType) => r !== type)
      : [...userReactions, type],
    reactionCounts: {
      ...reactionCounts,
      [type]: Math.max(0, (reactionCounts[type] || 0) + (wasActive ? -1 : 1)),
    },
    reactionCount: post.reactionCount + (wasActive ? -1 : 1),
  }
}

// Helper: apply a transform to a specific post across all SWR pages
function mapPostInPages(pages: any[], postId: string, transform: (post: any) => any) {
  return pages.map((page: any) => ({
    ...page,
    pinnedPosts: (page.pinnedPosts ?? []).map((p: any) => p.id === postId ? transform(p) : p),
    posts: (page.posts ?? []).map((p: any) => p.id === postId ? transform(p) : p),
  }))
}

export default function CommunityPage() {
  const { data: session } = useSession()
  const [category, setCategory] = useState<PostCategory | null>(null)
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'editor'

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasNextPage) return null
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    params.set('limit', '20')
    if (pageIndex > 0 && previousPageData?.nextCursor) {
      params.set('cursor', previousPageData.nextCursor)
    }
    return `/api/community/posts?${params.toString()}`
  }

  const { data, size, setSize, mutate, isLoading } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: true,
  })

  const pinnedPosts = data?.[0]?.pinnedPosts ?? []
  const allPosts = data ? data.flatMap((page: any) => page.posts ?? []) : []
  const hasMore = data ? data[data.length - 1]?.hasNextPage : false

  const handleCreatePost = useCallback(async (postData: { body: string; category: PostCategory; imageUrl?: string }) => {
    // Optimistic: insert temp post at top of first page
    const tempPost = {
      id: `temp-${Date.now()}`,
      body: postData.body,
      category: postData.category,
      imageUrl: postData.imageUrl ?? null,
      isPinned: false,
      commentCount: 0,
      reactionCount: 0,
      reactionCounts: {},
      createdAt: new Date().toISOString(),
      editedAt: null,
      author: {
        id: session?.user?.id ?? '',
        name: session?.user?.name ?? null,
        image: session?.user?.image ?? null,
        role: session?.user?.role ?? 'member',
      },
      userReactions: [],
    }

    const optimistic = data ? data.map((page: any, i: number) =>
      i === 0 ? { ...page, posts: [tempPost, ...(page.posts ?? [])] } : page
    ) : [{ pinnedPosts: [], posts: [tempPost], hasNextPage: false }]

    mutate(optimistic, { revalidate: false })

    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create post')
      }
      // Revalidate to get real ID from server
      mutate()
    } catch (err) {
      mutate() // rollback
      throw err
    }
  }, [mutate, data, session])

  const handleDelete = useCallback(async (postId: string) => {
    if (!confirm('Delete this post?')) return

    // Optimistic: remove post from all pages
    if (data) {
      const optimistic = data.map((page: any) => ({
        ...page,
        pinnedPosts: (page.pinnedPosts ?? []).filter((p: any) => p.id !== postId),
        posts: (page.posts ?? []).filter((p: any) => p.id !== postId),
      }))
      mutate(optimistic, { revalidate: false })
    }

    const res = await fetch(`/api/community/posts/${postId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Post deleted')
      mutate() // confirm with server
    } else {
      toast.error('Failed to delete')
      mutate() // rollback
    }
  }, [mutate, data])

  const handleReact = useCallback(async (postId: string, type: ReactionType) => {
    const userId = session?.user?.id
    if (!userId || !data) return

    // Optimistic: toggle reaction in cache
    const optimistic = mapPostInPages(data, postId, (post) => togglePostReaction(post, type, userId))
    mutate(optimistic, { revalidate: false })

    // Fire API in background
    try {
      const res = await fetch(`/api/community/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (!res.ok) mutate() // rollback on error
    } catch {
      mutate() // rollback on network error
    }
  }, [mutate, data, session])

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <FeedLayout>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-strong)]">Community</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Share insights and connect with fellow investors</p>
        </div>

        <div className="space-y-4">
          <PostComposer
            onSubmit={handleCreatePost}
            isAdmin={isAdmin}
            userImage={session?.user?.image}
            userName={session?.user?.name}
          />

          <div className="sticky top-0 z-10 bg-[var(--bg-page)] py-2 -mx-4 sm:-mx-6 px-4 sm:px-6">
            <CategoryTabs active={category} onChange={setCategory} />
          </div>

          <NewPostsBanner onRefresh={() => mutate()} />

          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[var(--gold-400)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Posts */}
          {!isLoading && (
            <div className="space-y-4">
              {pinnedPosts.map((post: any) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={session?.user?.id}
                  isAdmin={isAdmin}
                  onDelete={handleDelete}
                  onReact={handleReact}
                />
              ))}
              {allPosts.map((post: any) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={session?.user?.id}
                  isAdmin={isAdmin}
                  onDelete={handleDelete}
                  onReact={handleReact}
                />
              ))}
              {pinnedPosts.length === 0 && allPosts.length === 0 && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-12 text-center text-[var(--text-muted)] text-sm">
                  No posts yet. Be the first to share!
                </div>
              )}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={() => setSize(size + 1)}
              className="w-full py-3 text-sm text-[var(--gold-400)] hover:underline"
            >
              Load more posts
            </button>
          )}
        </div>
      </FeedLayout>
    </div>
  )
}
