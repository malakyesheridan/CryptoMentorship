// Simple in-memory rate limiting for development
// In production, use Redis or similar

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60 * 1000 // 1 minute
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs
    }
    rateLimitStore.set(key, newEntry)
    
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: newEntry.resetTime
    }
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime
  }
}

// Rate limiting configurations
const rateLimitConfigs = {
  'question-create': { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  'question-vote': { limit: 30, windowMs: 60 * 1000 }, // 30 per minute
}

export const rateLimit = {
  limit: async (userId: string, action: keyof typeof rateLimitConfigs) => {
    const config = rateLimitConfigs[action]
    const key = `${userId}:${action}`
    const result = checkRateLimit(key, config.limit, config.windowMs)
    
    return {
      success: result.allowed,
      remaining: result.remaining,
      resetTime: result.resetTime
    }
  }
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of Array.from(rateLimitStore.entries())) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes
