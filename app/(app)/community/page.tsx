'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { PostCategory, ReactionType } from '@prisma/client'
import { FeedLayout } from '@/components/community/FeedLayout'
import { CategoryTabs } from '@/components/community/CategoryTabs'
import { PostComposer } from '@/components/community/PostComposer'
import { PostCard } from '@/components/community/PostCard'
import { NewPostsBanner } from '@/components/community/NewPostsBanner'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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
    const res = await fetch('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create post')
    }
    mutate()
  }, [mutate])

  const handleDelete = useCallback(async (postId: string) => {
    if (!confirm('Delete this post?')) return
    const res = await fetch(`/api/community/posts/${postId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Post deleted')
      mutate()
    } else {
      toast.error('Failed to delete')
    }
  }, [mutate])

  const handleReact = useCallback(async (postId: string, type: ReactionType) => {
    const res = await fetch(`/api/community/posts/${postId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    if (res.ok) mutate()
  }, [mutate])

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <FeedLayout>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-strong)]">Community</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Share insights and connect with fellow investors</p>
        </div>

        <PostComposer onSubmit={handleCreatePost} isAdmin={isAdmin} />
        <CategoryTabs active={category} onChange={setCategory} />
        <NewPostsBanner onRefresh={() => mutate()} />

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--gold-400)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Posts */}
        {!isLoading && (
          <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-panel)] overflow-hidden">
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
              <div className="px-4 py-12 text-center text-[var(--text-muted)] text-sm">
                No posts yet. Be the first to share!
              </div>
            )}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <button
            onClick={() => setSize(size + 1)}
            className="w-full py-3 mt-4 text-sm text-[var(--gold-400)] hover:underline"
          >
            Load more posts
          </button>
        )}
      </FeedLayout>
    </div>
  )
}
