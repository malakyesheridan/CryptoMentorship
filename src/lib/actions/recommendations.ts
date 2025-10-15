'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-server'

interface RecommendationContext {
  userId: string
  contentType?: 'content' | 'episode' | 'track'
  limit?: number
  excludeIds?: string[]
}

interface RecommendationScore {
  id: string
  score: number
  reason: string
  type: 'learning_progress' | 'user_interests' | 'view_history' | 'similar_content' | 'trending'
}

interface ContentRecommendation {
  id: string
  title: string
  excerpt?: string
  kind?: string
  slug: string
  coverUrl?: string
  publishedAt: Date
  tags: string[]
  score: number
  reason: string
  type: 'content' | 'episode' | 'track'
}

// Main recommendation function
export async function getPersonalizedRecommendations(context: RecommendationContext) {
  const { userId, contentType, limit = 10, excludeIds = [] } = context

  // Get user profile data
  const userProfile = await getUserProfile(userId)
  
  // Get all available content
  const allContent = await getAllContent(contentType, excludeIds)
  
  // Calculate recommendation scores
  const scoredContent = await calculateRecommendationScores(allContent, userProfile)
  
  // Sort by score and return top recommendations
  return scoredContent
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// Get comprehensive user profile for recommendations
async function getUserProfile(userId: string) {
  const [
    interests,
    viewHistory,
    bookmarks,
    learningProgress,
    timeTracking,
    notificationPrefs
  ] = await Promise.all([
    getUserInterests(userId),
    getUserViewHistory(userId),
    getUserBookmarks(userId),
    getUserLearningProgress(userId),
    getUserTimeTracking(userId),
    getUserNotificationPreferences(userId)
  ])

  return {
    interests,
    viewHistory,
    bookmarks,
    learningProgress,
    timeTracking,
    notificationPrefs
  }
}

// Get user interests (tags they follow)
async function getUserInterests(userId: string) {
  const interests = await prisma.userInterest.findMany({
    where: { userId },
    select: { tag: true, createdAt: true }
  })

  return interests.map(i => i.tag)
}

// Get user view history with weights
async function getUserViewHistory(userId: string) {
  const views = await prisma.viewEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      entityType: true,
      entityId: true,
      createdAt: true,
      durationMs: true
    }
  })

  return views.map(view => ({
    entityType: view.entityType,
    entityId: view.entityId,
    createdAt: view.createdAt,
    durationMs: view.durationMs,
    // Weight recent views more heavily
    weight: Math.exp(-(Date.now() - view.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000))
  }))
}

// Get user bookmarks
async function getUserBookmarks(userId: string) {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: {
      content: {
        select: { id: true, title: true, tags: true, kind: true }
      },
      episode: {
        select: { id: true, title: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return bookmarks.map(bookmark => ({
    id: bookmark.id,
    entityType: bookmark.content ? 'content' : 'episode',
    entityId: bookmark.content?.id || bookmark.episode?.id,
    title: bookmark.content?.title || bookmark.episode?.title,
    tags: bookmark.content?.tags ? JSON.parse(bookmark.content.tags) : [],
    kind: bookmark.content?.kind,
    createdAt: bookmark.createdAt
  }))
}

// Get user learning progress
async function getUserLearningProgress(userId: string) {
  const [
    enrollments,
    lessonProgress,
    certificates
  ] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      include: {
        track: {
          select: { id: true, title: true, slug: true }
        }
      }
    }),
    prisma.lessonProgress.findMany({
      where: { userId },
      include: {
        lesson: {
          select: { id: true, title: true, track: { select: { title: true, slug: true } } }
        }
      }
    }),
    prisma.certificate.findMany({
      where: { userId },
      include: {
        track: {
          select: { id: true, title: true, slug: true }
        }
      }
    })
  ])

  return {
    enrollments,
    lessonProgress,
    certificates
  }
}

// Get user time tracking patterns
async function getUserTimeTracking(userId: string) {
  const sessions = await prisma.learningSession.findMany({
    where: { userId },
    include: {
      lesson: {
        select: { 
          id: true, 
          title: true, 
          track: { select: { title: true, slug: true } }
        }
      }
    },
    orderBy: { startTime: 'desc' },
    take: 50
  })

  return sessions.map(session => ({
    lessonId: session.lesson.id,
    lessonTitle: session.lesson.title,
    trackTitle: session.lesson.track.title,
    trackSlug: session.lesson.track.slug,
    timeSpentMs: session.timeSpentMs,
    sessionType: session.sessionType,
    startTime: session.startTime
  }))
}

// Get user notification preferences
async function getUserNotificationPreferences(userId: string) {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId }
  })

  return prefs || {
    onResearch: true,
    onEpisode: true,
    onSignal: true
  }
}

// Get all available content
async function getAllContent(contentType?: string, excludeIds: string[] = []) {
  const where: any = {}
  
  if (contentType === 'content') {
    where.kind = { not: null }
  } else if (contentType === 'episode') {
    // Episodes are handled separately
    return await prisma.episode.findMany({
      where: {
        id: { notIn: excludeIds },
        publishedAt: { not: null as any }
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        slug: true,
        coverUrl: true,
        publishedAt: true,
        createdAt: true
      }
    })
  } else if (contentType === 'track') {
    return await prisma.track.findMany({
      where: {
        id: { notIn: excludeIds },
        publishedAt: { not: null }
      },
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        coverUrl: true,
        publishedAt: true,
        createdAt: true
      }
    })
  }

  if (excludeIds.length > 0) {
    where.id = { notIn: excludeIds }
  }

  const content = await prisma.content.findMany({
    where: {
      ...where,
      publishedAt: { not: null }
    },
    select: {
      id: true,
      title: true,
      excerpt: true,
      kind: true,
      slug: true,
      coverUrl: true,
      publishedAt: true,
      tags: true,
      createdAt: true
    }
  })

  return content.map(item => ({
    ...item,
    tags: item.tags ? JSON.parse(item.tags) : []
  }))
}

// Calculate recommendation scores for content
async function calculateRecommendationScores(content: any[], userProfile: any) {
  const scoredContent: ContentRecommendation[] = []

  for (const item of content) {
    let totalScore = 0
    const reasons: string[] = []

    // Score based on user interests
    const interestScore = calculateInterestScore(item, userProfile.interests)
    if (interestScore > 0) {
      totalScore += interestScore
      reasons.push('Matches your interests')
    }

    // Score based on view history
    const viewScore = calculateViewHistoryScore(item, userProfile.viewHistory)
    if (viewScore > 0) {
      totalScore += viewScore
      reasons.push('Similar to content you\'ve viewed')
    }

    // Score based on learning progress
    const learningScore = calculateLearningScore(item, userProfile.learningProgress)
    if (learningScore > 0) {
      totalScore += learningScore
      reasons.push('Related to your learning path')
    }

    // Score based on bookmarks
    const bookmarkScore = calculateBookmarkScore(item, userProfile.bookmarks)
    if (bookmarkScore > 0) {
      totalScore += bookmarkScore
      reasons.push('Similar to your bookmarks')
    }

    // Score based on notification preferences
    const notificationScore = calculateNotificationScore(item, userProfile.notificationPrefs)
    if (notificationScore > 0) {
      totalScore += notificationScore
      reasons.push('Matches your notification preferences')
    }

    // Add recency boost
    const recencyScore = calculateRecencyScore(item)
    totalScore += recencyScore

    // Add trending boost
    const trendingScore = calculateTrendingScore(item)
    totalScore += trendingScore

    if (totalScore > 0) {
      scoredContent.push({
        id: item.id,
        title: item.title,
        excerpt: item.excerpt,
        kind: item.kind,
        slug: item.slug,
        coverUrl: item.coverUrl,
        publishedAt: item.publishedAt,
        tags: item.tags || [],
        score: totalScore,
        reason: reasons.join(', ') || 'Recommended for you',
        type: 'content'
      })
    }
  }

  return scoredContent
}

// Calculate score based on user interests
function calculateInterestScore(item: any, interests: string[]): number {
  if (!interests.length || !item.tags) return 0

  const itemTags = Array.isArray(item.tags) ? item.tags : JSON.parse(item.tags || '[]')
  const matchingTags = itemTags.filter((tag: string) => interests.includes(tag))
  
  return matchingTags.length * 10 // 10 points per matching interest tag
}

// Calculate score based on view history
function calculateViewHistoryScore(item: any, viewHistory: any[]): number {
  if (!viewHistory.length) return 0

  // Find similar content in view history
  const similarViews = viewHistory.filter(view => {
    if (view.entityType === 'content' && item.kind) {
      return view.entityId === item.id
    }
    return false
  })

  if (similarViews.length === 0) return 0

  // Weight by recency and duration
  const totalWeight = similarViews.reduce((sum, view) => sum + (view.weight || 1), 0)
  return totalWeight * 5 // 5 points per weighted view
}

// Calculate score based on learning progress
function calculateLearningScore(item: any, learningProgress: any): number {
  if (!learningProgress.enrollments.length) return 0

  // Check if content is related to enrolled tracks
  const enrolledTrackTitles = learningProgress.enrollments.map((e: any) => e.track.title.toLowerCase())
  const itemTitle = item.title.toLowerCase()
  
  const isRelated = enrolledTrackTitles.some((trackTitle: string) => 
    itemTitle.includes(trackTitle) || trackTitle.includes(itemTitle)
  )

  return isRelated ? 15 : 0 // 15 points for learning-related content
}

// Calculate score based on bookmarks
function calculateBookmarkScore(item: any, bookmarks: any[]): number {
  if (!bookmarks.length) return 0

  // Check if similar content is bookmarked
  const similarBookmarks = bookmarks.filter(bookmark => {
    if (bookmark.entityType === 'content' && bookmark.kind === item.kind) {
      const bookmarkTags = bookmark.tags || []
      const itemTags = Array.isArray(item.tags) ? item.tags : JSON.parse(item.tags || '[]')
      const commonTags = bookmarkTags.filter((tag: string) => itemTags.includes(tag))
      return commonTags.length > 0
    }
    return false
  })

  return similarBookmarks.length * 8 // 8 points per similar bookmark
}

// Calculate score based on notification preferences
function calculateNotificationScore(item: any, notificationPrefs: any): number {
  if (!notificationPrefs) return 0

  let score = 0
  
  if (item.kind === 'research' && notificationPrefs.onResearch) {
    score += 5
  }
  if (item.kind === 'episode' && notificationPrefs.onEpisode) {
    score += 5
  }
  if (item.kind === 'signal' && notificationPrefs.onSignal) {
    score += 5
  }

  return score
}

// Calculate recency score
function calculateRecencyScore(item: any): number {
  const daysSincePublished = (Date.now() - new Date(item.publishedAt).getTime()) / (24 * 60 * 60 * 1000)
  
  if (daysSincePublished < 1) return 10 // Very recent
  if (daysSincePublished < 7) return 5  // Recent
  if (daysSincePublished < 30) return 2 // Somewhat recent
  
  return 0 // Old content
}

// Calculate trending score (simplified - based on recent views)
function calculateTrendingScore(item: any): number {
  // This would ideally be based on actual trending data
  // For now, we'll use a simple heuristic based on recency
  const daysSincePublished = (Date.now() - new Date(item.publishedAt).getTime()) / (24 * 60 * 60 * 1000)
  
  if (daysSincePublished < 3) return 3 // Trending
  if (daysSincePublished < 7) return 1 // Somewhat trending
  
  return 0
}

// Get recommendations for specific content types
export async function getContentRecommendations(userId: string, limit: number = 6) {
  return getPersonalizedRecommendations({
    userId,
    contentType: 'content',
    limit
  })
}

export async function getEpisodeRecommendations(userId: string, limit: number = 6) {
  return getPersonalizedRecommendations({
    userId,
    contentType: 'episode',
    limit
  })
}

export async function getTrackRecommendations(userId: string, limit: number = 6) {
  return getPersonalizedRecommendations({
    userId,
    contentType: 'track',
    limit
  })
}

// Get "Continue Learning" recommendations
export async function getContinueLearningRecommendations(userId: string) {
  const userProfile = await getUserProfile(userId)
  
  // Get incomplete tracks
  const incompleteTracks = userProfile.learningProgress.enrollments
    .filter((enrollment: any) => enrollment.progressPct < 100)
    .map((enrollment: any) => ({
      ...enrollment.track,
      progressPct: enrollment.progressPct,
      type: 'track',
      reason: 'Continue your learning journey',
      score: 100 - enrollment.progressPct // Higher score for less progress
    }))

  // Get next lessons in enrolled tracks
  const nextLessons = await getNextLessonsInTracks(userId, incompleteTracks.map((t: any) => t.id))

  return [...incompleteTracks, ...nextLessons]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

// Get next lessons in enrolled tracks
async function getNextLessonsInTracks(userId: string, trackIds: string[]) {
  if (trackIds.length === 0) return []

  const nextLessons = []

  for (const trackId of trackIds) {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        sections: {
          include: {
            lessons: {
              where: { publishedAt: { not: null } },
              orderBy: { order: 'asc' },
              include: {
                progresses: {
                  where: { userId }
                }
              }
            }
          }
        }
      }
    })

    if (!track) continue

    // Find the next incomplete lesson
    for (const section of track.sections) {
      for (const lesson of section.lessons) {
        const isCompleted = lesson.progresses.some((p: any) => p.completedAt)
        if (!isCompleted) {
          nextLessons.push({
            id: lesson.id,
            title: lesson.title,
            slug: lesson.slug,
            trackTitle: track.title,
            trackSlug: track.slug,
            sectionTitle: section.title,
            type: 'lesson',
            reason: `Next lesson in ${track.title}`,
            score: 50 // Medium priority for next lessons
          })
          break
        }
      }
      if (nextLessons.length > 0) break
    }
  }

  return nextLessons
}
