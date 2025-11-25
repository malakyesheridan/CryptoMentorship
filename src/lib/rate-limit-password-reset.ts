import { checkRateLimit } from './rate-limit'

/**
 * Rate limiting for password reset requests
 * - 3 requests per hour per email address
 * - 5 requests per hour per IP address
 * - Prevents abuse and email enumeration attacks
 */
export function checkPasswordResetRateLimit(
  email: string,
  ip: string
): { allowed: boolean; reason?: string; retryAfter?: number } {
  // Check email-based rate limit (3 per hour)
  const emailLimit = checkRateLimit(`password-reset:email:${email}`, 3, 60 * 60 * 1000)
  if (!emailLimit.allowed) {
    return {
      allowed: false,
      reason: 'Too many password reset requests for this email. Please wait before requesting another.',
      retryAfter: Math.ceil((emailLimit.resetTime - Date.now()) / 1000),
    }
  }

  // Check IP-based rate limit (5 per hour)
  const ipLimit = checkRateLimit(`password-reset:ip:${ip}`, 5, 60 * 60 * 1000)
  if (!ipLimit.allowed) {
    return {
      allowed: false,
      reason: 'Too many password reset requests from this IP. Please wait before trying again.',
      retryAfter: Math.ceil((ipLimit.resetTime - Date.now()) / 1000),
    }
  }

  return { allowed: true }
}

