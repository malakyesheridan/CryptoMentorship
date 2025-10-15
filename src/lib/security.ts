import { NextRequest, NextResponse } from 'next/server'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(limit: number = 10, windowMs: number = 60000) {
  return (req: NextRequest) => {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up expired entries
    for (const [key, value] of Array.from(rateLimitStore.entries())) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }

    // Get or create rate limit entry
    const entry = rateLimitStore.get(ip) || { count: 0, resetTime: now + windowMs }
    
    if (entry.resetTime < now) {
      entry.count = 0
      entry.resetTime = now + windowMs
    }

    entry.count++

    if (entry.count > limit) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString()
          }
        }
      )
    }

    rateLimitStore.set(ip, entry)
    return null
  }
}

// CSRF protection
export function csrfProtection(req: NextRequest) {
  const method = req.method
  const contentType = req.headers.get('content-type') || ''
  
  // Skip CSRF for safe methods and non-form content
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null
  }
  
  if (!contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded')) {
    return null
  }

  // Check for CSRF token in headers
  const csrfToken = req.headers.get('x-csrf-token')
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  
  // Allow requests from same origin
  if (origin && referer && new URL(origin).origin === new URL(referer).origin) {
    return null
  }

  // In development, be more lenient
  if (process.env.NODE_ENV === 'development') {
    return null
  }

  return NextResponse.json(
    { error: 'CSRF token missing or invalid' },
    { status: 403 }
  )
}

// Security headers middleware
export function securityHeaders(req: NextRequest) {
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.neon.tech",
    "frame-ancestors 'none'"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  return response
}
