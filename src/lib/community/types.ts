import { PostCategory, ReactionType } from '@prisma/client'

export interface PostAuthor {
  id: string
  name: string | null
  image: string | null
  role: string
  createdAt: Date
}

export interface PostWithDetails {
  id: string
  authorId: string
  category: PostCategory
  body: string
  imageUrl: string | null
  isPinned: boolean
  isShadowHidden: boolean
  commentCount: number
  reactionCount: number
  reactionCounts: Partial<Record<ReactionType, number>>
  createdAt: Date
  updatedAt: Date
  editedAt: Date | null
  author: PostAuthor
  userReactions: ReactionType[]
}

export interface PaginatedPosts {
  pinnedPosts: PostWithDetails[]
  posts: PostWithDetails[]
  hasNextPage: boolean
  nextCursor?: string
}
