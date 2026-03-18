import { PostCategory, ReactionType } from '@prisma/client'

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  ANNOUNCEMENTS: 'Announcements',
  GENERAL: 'General',
  ANALYSIS: 'Analysis',
  QUESTIONS: 'Questions',
  SHOWCASE: 'Showcase',
}

export const CATEGORY_COLORS: Record<PostCategory, { bg: string; text: string }> = {
  ANNOUNCEMENTS: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  GENERAL: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  ANALYSIS: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  QUESTIONS: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  SHOWCASE: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
}

export const CATEGORY_LIST = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value: value as PostCategory,
  label,
}))

export const REACTION_EMOJI: Record<ReactionType, string> = {
  LIKE: '\u{1F44D}',
  BULLISH: '\u{1F402}',
  BEARISH: '\u{1F4C9}',
  INSIGHTFUL: '\u{1F4A1}',
  FIRE: '\u{1F525}',
}

export const REACTION_LABELS: Record<ReactionType, string> = {
  LIKE: 'Like',
  BULLISH: 'Bullish',
  BEARISH: 'Bearish',
  INSIGHTFUL: 'Insightful',
  FIRE: 'Fire',
}

export const POST_BODY_MAX_LENGTH = 5000
export const COMMENT_BODY_MAX_LENGTH = 2000
export const MAX_COMMENT_DEPTH = 5
export const POSTS_PER_PAGE = 20
export const COMMENTS_PER_PAGE = 20
