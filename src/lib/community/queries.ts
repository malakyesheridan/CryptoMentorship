import { prisma } from '@/lib/prisma'
import { PostCategory, Prisma } from '@prisma/client'
import { POSTS_PER_PAGE } from './constants'

const postAuthorSelect = {
  id: true,
  name: true,
  image: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect

const postWithDetailsInclude = (currentUserId?: string) => ({
  author: { select: postAuthorSelect },
  reactions: currentUserId
    ? { where: { userId: currentUserId }, select: { type: true } }
    : false,
  _count: { select: { comments: true, reactions: true } },
}) satisfies Prisma.PostInclude

export async function getPosts({
  category,
  cursor,
  limit = POSTS_PER_PAGE,
  currentUserId,
}: {
  category?: PostCategory
  cursor?: string
  limit?: number
  currentUserId?: string
}) {
  const where: Prisma.PostWhereInput = {
    isShadowHidden: false,
    ...(category && { category }),
  }

  // Fetch pinned posts separately (only on first page)
  let pinnedPosts: any[] = []
  if (!cursor) {
    pinnedPosts = await prisma.post.findMany({
      where: { ...where, isPinned: true },
      include: postWithDetailsInclude(currentUserId),
      orderBy: { createdAt: 'desc' },
    })
  }

  const pinnedIds = pinnedPosts.map((p) => p.id)

  const posts = await prisma.post.findMany({
    where: {
      ...where,
      isPinned: false,
      ...(pinnedIds.length > 0 && { id: { notIn: pinnedIds } }),
    },
    include: postWithDetailsInclude(currentUserId),
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  })

  const hasNextPage = posts.length > limit
  const items = posts.slice(0, limit)
  const nextCursor = hasNextPage ? items[items.length - 1]?.id : undefined

  return {
    pinnedPosts: pinnedPosts.map(formatPost),
    posts: items.map(formatPost),
    hasNextPage,
    nextCursor,
  }
}

export async function getPostById(postId: string, currentUserId?: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: postWithDetailsInclude(currentUserId),
  })
  if (!post) return null
  return formatPost(post)
}

export async function createPost({
  authorId,
  category,
  body,
  imageUrl,
}: {
  authorId: string
  category: PostCategory
  body: string
  imageUrl?: string
}) {
  return prisma.post
    .create({
      data: { authorId, category, body, imageUrl },
      include: postWithDetailsInclude(authorId),
    })
    .then(formatPost)
}

export async function updatePost(postId: string, data: { body?: string; imageUrl?: string }) {
  return prisma.post.update({
    where: { id: postId },
    data: { ...data, editedAt: new Date() },
  })
}

export async function deletePost(postId: string) {
  return prisma.post.delete({ where: { id: postId } })
}

function formatPost(post: any) {
  return {
    ...post,
    commentCount: post._count?.comments ?? post.commentCount ?? 0,
    reactionCount: post._count?.reactions ?? post.reactionCount ?? 0,
    userReactions: (post.reactions ?? []).map((r: any) => r.type),
    _count: undefined,
    reactions: undefined,
  }
}
